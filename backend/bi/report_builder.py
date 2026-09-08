# backend/bi/report_builder.py
from django.db import connection
import json

class ReportBuilder:
    """Dynamic report builder with case‑sensitive filter support."""

    @staticmethod
    def get_available_tables():
        """Return all user tables with their columns (dynamically from DB)."""
        tables = []
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' 
                AND name NOT LIKE 'sqlite_%' 
                AND name NOT LIKE 'django_%' 
                AND name NOT LIKE 'auth_%' 
                AND name NOT LIKE 'django_celery_%' 
                AND name NOT LIKE 'bi_%'
            """)
            table_names = [row[0] for row in cursor.fetchall()]

            for table in table_names:
                cursor.execute(f"PRAGMA table_info({table})")
                columns = cursor.fetchall()
                fields = []
                foreign_keys = {}
                for col in columns:
                    field_name = col[1]
                    field_type = col[2].lower()
                    # NOTE: 'bool' must be checked before 'int' — Django's sqlite
                    # backend stores BooleanField columns with type "bool", and
                    # without this check they were previously mis-typed as
                    # 'string' (bool doesn't contain "int"), which meant boolean
                    # filters silently never worked (see is_boolean below).
                    if 'bool' in field_type:
                        type_ = 'boolean'
                    elif 'int' in field_type:
                        type_ = 'integer'
                    elif 'real' in field_type or 'decimal' in field_type or 'numeric' in field_type:
                        type_ = 'decimal'
                    elif 'date' in field_type:
                        type_ = 'date'
                    elif 'time' in field_type or 'datetime' in field_type:
                        type_ = 'datetime'
                    elif 'text' in field_type or 'char' in field_type:
                        type_ = 'string'
                    else:
                        type_ = 'string'
                    fields.append({
                        'name': field_name,
                        'label': field_name.replace('_', ' ').title(),
                        'type': type_
                    })

                # Real, declared foreign keys — read from SQLite's own catalog
                # instead of guessing from the column name. The old approach
                # (`field_name.endswith('_id')` -> strip "_id" -> assume that's
                # the table name) breaks the moment a table's name doesn't
                # match its model name, which is the normal case in Django:
                # e.g. "user_id" on hostels_studentprofile actually points at
                # "accounts_user", not a table literally named "user". When the
                # guessed table didn't exist, build_query's join-matching
                # silently fell back to CROSS JOIN (a full Cartesian product),
                # which is what caused duplicated/incorrect result rows.
                cursor.execute(f'PRAGMA foreign_key_list("{table}")')
                for fk in cursor.fetchall():
                    # columns: (id, seq, table, from, to, on_update, on_delete, match)
                    from_column = fk[3]
                    referenced_table = fk[2]
                    foreign_keys[from_column] = referenced_table

                tables.append({
                    'table': table,
                    'name': table.replace('_', ' ').title(),
                    'label': table.replace('_', ' ').title(),
                    'fields': fields,
                    'foreign_keys': foreign_keys
                })
        return tables

    @staticmethod
    def build_query(tables, fields, filters=None, group_by=None, sort_by=None, date_range=None, distinct=False):
        """Build SQL query from selections, handling case_sensitive for string fields."""
        if not tables or not fields:
            return ""

        all_tables = {t['table']: t for t in ReportBuilder.get_available_tables()}

        def is_valid_table(name):
            return name in all_tables

        def is_valid_field(table_name, field_name):
            if table_name not in all_tables:
                return False
            return any(f['name'] == field_name for f in all_tables[table_name]['fields'])

        # Tables/fields ultimately end up interpolated directly into raw SQL
        # (there's no parameterized-identifier support in DB-API), so every
        # table/field name must be checked against the real schema before use.
        # Only filter *values* were being escaped before; a caller could pass
        # an arbitrary string as "table" or "field" and inject SQL. Silently
        # drop anything that doesn't match a real table/column instead.
        tables = [t for t in tables if is_valid_table(t)]
        fields = [f for f in fields if is_valid_table(f.get('table')) and is_valid_field(f.get('table'), f.get('name'))]
        if not tables or not fields:
            return ""

        select_clause = []
        where_clause = []
        group_clause = []
        order_clause = []
        join_clauses = []

        # SELECT all requested fields
        for field in fields:
            table = field.get('table')
            field_name = field.get('name')
            alias = f"{table}_{field_name}".replace('.', '_')
            select_clause.append(f'"{table}"."{field_name}" as "{alias}"')

        # Build FROM with joins. Supports multi-hop paths through tables not
        # explicitly selected (e.g. accounts_user -> hostels_studentprofile ->
        # fees_monthlyfee) instead of only checking for a *direct* FK between
        # the main table and each other table. Previously, when no direct FK
        # existed, this silently fell back to CROSS JOIN - producing a full
        # cartesian product of unrelated rows (e.g. every user x every fee
        # record) with no error or warning. That fallback has been removed
        # entirely: if no path exists even indirectly, build_query() now
        # returns "" (same convention as the invalid-table/field case above)
        # so the caller can surface a clear error instead of wrong data.
        main_table = tables[0]
        from_clause = f'"{main_table}"'
        join_graph = ReportBuilder._build_join_graph(all_tables)
        joined_tables = {main_table}
        joined_order = [main_table]
        unreachable_tables = []

        for table in tables[1:]:
            if table in joined_tables:
                continue  # already pulled in as an intermediate hop for an earlier table
            path = ReportBuilder._find_join_path(table, joined_order, join_graph)
            if path is None:
                unreachable_tables.append(table)
                continue
            for step_table, step_clause in path:
                join_clauses.append(step_clause)
                joined_tables.add(step_table)
                joined_order.append(step_table)

        if unreachable_tables:
            return ""

        full_from = from_clause + (' ' + ' '.join(join_clauses) if join_clauses else '')

        # Process filters with case_sensitive support
        if filters:
            for filter_item in filters:
                table = filter_item.get('table')
                field = filter_item.get('field')
                operator = filter_item.get('operator', 'eq')
                value = filter_item.get('value')
                case_sensitive = filter_item.get('case_sensitive', False)

                if not table or not field or not is_valid_field(table, field):
                    continue

                # Determine field type
                is_boolean = False
                is_string = False
                for f in all_tables[table]['fields']:
                    if f['name'] == field:
                        ftype = f.get('type', 'string')
                        if ftype == 'boolean':
                            is_boolean = True
                        elif ftype == 'string':
                            is_string = True
                        break

                # Boolean fields: convert value to 0/1
                if is_boolean:
                    if isinstance(value, str):
                        value = 1 if value.lower() in ['true', '1', 'yes', 'on'] else 0
                    elif isinstance(value, bool):
                        value = 1 if value else 0
                    else:
                        try:
                            value = int(value)
                        except:
                            value = 0
                    where_clause.append(f'"{table}"."{field}" = {value}')
                    continue

                # String fields: handle case sensitivity
                if is_string:
                    if isinstance(value, str):
                        value = value.replace("'", "''")
                        if not case_sensitive:
                            # Case‑insensitive: use UPPER()
                            value_upper = value.upper()
                            if operator == 'eq':
                                where_clause.append(f'UPPER("{table}"."{field}") = UPPER(\'{value}\')')
                            elif operator == 'contains':
                                where_clause.append(f'UPPER("{table}"."{field}") LIKE \'%{value_upper}%\'')
                            else:
                                where_clause.append(f'UPPER("{table}"."{field}") = UPPER(\'{value}\')')
                        else:
                            # Case‑sensitive: direct comparison
                            if operator == 'eq':
                                where_clause.append(f'"{table}"."{field}" = \'{value}\'')
                            elif operator == 'contains':
                                where_clause.append(f'"{table}"."{field}" LIKE \'%{value}%\'')
                            else:
                                where_clause.append(f'"{table}"."{field}" = \'{value}\'')
                    else:
                        # Non‑string value for string field (shouldn't happen, but fallback)
                        where_clause.append(f'"{table}"."{field}" = {value}')
                    continue

                # Other types (numeric, date): ignore case_sensitive flag.
                # NOTE: gt/lt/gte/lte were previously not handled at all here
                # and silently fell through to an "=" comparison, so the
                # ">"/"<"/">="/"<=" options in the UI never actually worked.
                sql_ops = {'gt': '>', 'lt': '<', 'gte': '>=', 'lte': '<='}
                if isinstance(value, str):
                    value = value.replace("'", "''")
                    if operator == 'contains':
                        where_clause.append(f'"{table}"."{field}" LIKE \'%{value}%\'')
                    elif operator in sql_ops:
                        where_clause.append(f'"{table}"."{field}" {sql_ops[operator]} \'{value}\'')
                    else:
                        where_clause.append(f'"{table}"."{field}" = \'{value}\'')
                else:
                    if operator in sql_ops:
                        where_clause.append(f'"{table}"."{field}" {sql_ops[operator]} {value}')
                    else:
                        where_clause.append(f'"{table}"."{field}" = {value}')

        # Date range filter
        if date_range and date_range.get('field') and date_range.get('start') and date_range.get('end'):
            field = date_range.get('field')
            table = date_range.get('table')
            if table and field and is_valid_field(table, field):
                start = str(date_range.get('start')).replace("'", "''")
                end = str(date_range.get('end')).replace("'", "''")
                where_clause.append(
                    f'"{table}"."{field}" BETWEEN \'{start}\' AND \'{end}\''
                )

        # GROUP BY
        if group_by:
            for group in group_by:
                table = group.get('table')
                field = group.get('field')
                if table and field and is_valid_field(table, field):
                    group_clause.append(f'"{table}"."{field}"')

        # ORDER BY
        if sort_by:
            for sort in sort_by:
                table = sort.get('table')
                field = sort.get('field')
                direction = 'ASC' if sort.get('direction') == 'asc' else 'DESC'
                if table and field and is_valid_field(table, field):
                    order_clause.append(f'"{table}"."{field}" {direction}')

        select_str = ', '.join(select_clause)
        where_str = ' AND '.join(where_clause) if where_clause else ''
        group_str = ', '.join(group_clause) if group_clause else ''
        order_str = ', '.join(order_clause) if order_clause else ''
        # NOTE: the "distinct" option coming from the UI (and the CustomReport
        # model's own `distinct` field) was never actually wired up — it never
        # reached build_query, so SELECT DISTINCT was never emitted.
        distinct_str = 'DISTINCT ' if distinct else ''

        query = f"""
            SELECT {distinct_str}{select_str}
            FROM {full_from}
            {f'WHERE {where_str}' if where_str else ''}
            {f'GROUP BY {group_str}' if group_str else ''}
            {f'ORDER BY {order_str}' if order_str else ''}
        """
        return ' '.join(query.split())

    @staticmethod
    def _build_join_graph(all_tables):
        """
        Build an undirected adjacency graph over declared FK relationships.
        Each edge stores the LEFT JOIN clause to use when the neighbor is the
        "new" table being brought into the query and the other side is
        already present - so the same edge works for traversal in either
        direction, regardless of which table actually owns the FK column.
        """
        graph = {t: [] for t in all_tables}
        for t1, info in all_tables.items():
            for fk_field, t2 in info['foreign_keys'].items():
                if t2 not in all_tables:
                    continue
                graph[t1].append((t2, f'LEFT JOIN "{t2}" ON "{t1}"."{fk_field}" = "{t2}"."id"'))
                graph[t2].append((t1, f'LEFT JOIN "{t1}" ON "{t1}"."{fk_field}" = "{t2}"."id"'))
        return graph

    @staticmethod
    def _find_join_path(target, present_tables, graph):
        """
        Multi-source BFS from every table already present in the query to
        `target`, over the FK relationship graph - finds the shortest chain
        of joins through any intermediate table (selected by the user or
        not), not just a direct one-hop relationship.

        Real schemas often have more than one FK path of the same length
        between two tables that mean very different things (e.g. a "student"
        table reachable both through their profile AND, coincidentally,
        through "who uploaded this payment proof" - same hop count, totally
        different relationship). Silently picking one is exactly the kind of
        wrong-but-plausible-looking join that caused the original CROSS JOIN
        bug, just harder to notice. So this only auto-resolves when there is
        a UNIQUE shortest path; if more than one exists, it's treated the
        same as "no path found" rather than guessed at.

        Returns an ordered list of (table, join_clause) hops to append to
        the query, or None if no path exists at all, or if the shortest
        path is ambiguous (multiple distinct shortest paths exist).
        """
        from collections import deque

        if target in present_tables:
            return []

        dist = {t: 0 for t in present_tables}
        parents = {}  # node -> list of (parent, clause) achieving the shortest distance
        queue = deque(present_tables)

        while queue:
            current = queue.popleft()
            for neighbor, clause in graph.get(current, []):
                nd = dist[current] + 1
                if neighbor not in dist:
                    dist[neighbor] = nd
                    parents[neighbor] = [(current, clause)]
                    queue.append(neighbor)
                elif dist[neighbor] == nd:
                    parents[neighbor].append((current, clause))

        if target not in dist:
            return None  # unreachable, even indirectly

        memo = {}

        def count_paths(node):
            if node in present_tables:
                return 1
            if node in memo:
                return memo[node]
            total = sum(count_paths(p) for p, _ in parents.get(node, []))
            memo[node] = total
            return total

        if count_paths(target) != 1:
            # When the target has multiple direct relationships to already
            # selected tables, prefer the most recently selected parent. This
            # preserves the report builder's table order and avoids rejecting
            # common hostel reports such as User -> StudentProfile -> Hostel,
            # while still refusing ambiguous multi-hop paths.
            direct_parents = [parent for parent, _ in parents.get(target, []) if parent in present_tables]
            if not direct_parents:
                return None
            parent_order = {table: index for index, table in enumerate(present_tables)}
            preferred_parent = max(direct_parents, key=lambda parent: parent_order[parent])
            semantic_preferences = {
                # Student fields should stay joined to their user identity,
                # otherwise adding hostel context can multiply every user by
                # every student in that hostel.
                "hostels_studentprofile": ["accounts_user"],
                # When a report already selected StudentProfile, hostel
                # context should follow the student's hostel assignment.
                "hostels_hostel": ["hostels_studentprofile"],
            }
            for preferred in semantic_preferences.get(target, []):
                if preferred in direct_parents:
                    preferred_parent = preferred
                    break
            parents[target] = [
                (parent, clause)
                for parent, clause in parents[target]
                if parent == preferred_parent
            ]

        path = []
        node = target
        while node not in present_tables:
            parent, clause = parents[node][0]
            path.append((node, clause))
            node = parent
        path.reverse()
        return path

    @staticmethod
    def execute_query(query, fields=None):
        """Execute raw SQL and return results as list of dicts.

        `fields` (the same list passed to build_query, in the same order) is
        used to derive readable, collision-free keys for the result dicts.
        Previously the code parsed the SQL alias by splitting on '_' and
        taking the last chunk (`col.split('_')[-1]`), which:
          - mangled any multi-word field name, e.g. "purchases_total_cost"
            became just "cost", and
          - silently collided whenever two selected fields shared their last
            underscore-separated word (e.g. "students_id" and "hostels_id"
            both became "id"), overwriting one field's data with another's
            for every row.
        """
        with connection.cursor() as cursor:
            try:
                cursor.execute(query)
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
                results = []
                for row in rows:
                    result_dict = {}
                    used_keys = set()
                    for i, col in enumerate(columns):
                        if fields and i < len(fields):
                            key = fields[i].get('name', col)
                            if key in used_keys:
                                # Disambiguate a same-named field from another table.
                                key = f"{fields[i].get('table', '')}_{key}"
                        else:
                            key = col
                        used_keys.add(key)
                        result_dict[key] = row[i]
                    results.append(result_dict)
                return results
            except Exception as e:
                print(f"Query execution error: {e}\nQuery: {query}")
                return []