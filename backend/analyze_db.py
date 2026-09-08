import sqlite3
import os

# =====================================================================
# CHANGE THIS VALUE TO MATCH YOUR ACTUAL SQLITE DATABASE FILE NAME
# =====================================================================
DATABASE_FILE = 'db.sqlite3' 
OUTPUT_FILE = 'database_relationships.txt'

def analyze_database(db_path, output_path):
    if not os.path.exists(db_path):
        print(f"Error: Database file '{db_path}' not found.")
        print("Please place this script in the same directory as your database and update DATABASE_FILE.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Fetch all table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row[0] for row in cursor.fetchall()]
    
    report = []
    report.append("=" * 60)
    report.append("          SQLITE DATABASE RELATIONSHIP REPORT          ")
    report.append("=" * 60)
    report.append(f"Database Analyzed: {os.path.basename(db_path)}")
    report.append(f"Total Tables Found: {len(tables)}\n")
    
    schema_map = {}
    
    # Part 1: Individual Table Details
    report.append("1. TABLE DETAILS & PRIMARY KEYS")
    report.append("-" * 31)
    
    for table in tables:
        report.append(f"\nTable: {table}")
        
        # Get column info: (cid, name, type, notnull, dflt_value, pk)
        cursor.execute(f"PRAGMA table_info('{table}');")
        columns = cursor.fetchall()
        
        primary_keys = []
        all_cols = []
        for col in columns:
            col_name = col[1]
            all_cols.append(col_name)
            if col[5]: # check if pk integer flag is > 0
                primary_keys.append(col_name)
                
        report.append(f"  Columns: {', '.join(all_cols)}")
        report.append(f"  Primary Key(s): {', '.join(primary_keys) if primary_keys else 'None Explicitly Defined'}")
        schema_map[table] = {"pk": primary_keys, "cols": all_cols}

    # Part 2: Explicit Relationships (Foreign Keys)
    report.append("\n" + "=" * 60)
    report.append("2. EXPLICIT RELATIONSHIPS (FOREIGN KEYS)")
    report.append("-" * 40)
    
    has_explicit_fks = False
    for table in tables:
        # Get foreign key info: (id, seq, table, from, to, on_update, on_delete, match)
        cursor.execute(f"PRAGMA foreign_key_list('{table}');")
        fks = cursor.fetchall()
        
        if fks:
            has_explicit_fks = True
            for fk in fks:
                from_col = fk[3]
                to_table = fk[2]
                to_col = fk[4]
                report.append(f"• Table [{table}] links to Table [{to_table}]")
                report.append(f"  Key Match Rule: {table}.{from_col} = {to_table}.{to_col}")
                report.append(f"  SQL Join Example: FROM {table} JOIN {to_table} ON {table}.{from_col} = {to_table}.{to_col}\n")
                
    if not has_explicit_fks:
        report.append("No explicit foreign key constraints were found configured in this database file.")

    # Part 3: Implicit Smart Guesses (Naming Conventions)
    report.append("\n" + "=" * 60)
    report.append("3. IMPLICIT SMART GUESSES (NAMING CONVENTIONS)")
    report.append("-" * 46)
    report.append("The fields below look like links because their names match columns in other tables:\n")
    
    has_implicit_links = False
    for table, metadata in schema_map.items():
        for col in metadata["cols"]:
            if col.endswith('_id') or col == 'id':
                for other_table, other_metadata in schema_map.items():
                    if table == other_table:
                        continue
                    
                    target_matches = False
                    if col.endswith('_id'):
                        base_name = col[:-3] # remove '_id'
                        if other_table.endswith(base_name) and 'id' in other_metadata["pk"]:
                            target_matches = True
                            target_col = 'id'
                    
                    if not target_matches and col in other_metadata["cols"] and col != 'id':
                        target_matches = True
                        target_col = col
                        
                    if target_matches:
                        has_implicit_links = True
                        report.append(f"• Potential Link: Table [{table}] to Table [{other_table}]")
                        report.append(f"  Suggested Match: {table}.{col} = {other_table}.{target_col}")
                        report.append(f"  SQL Join Example: FROM {table} JOIN {other_table} ON {table}.{col} = {other_table}.{target_col}\n")

    if not has_implicit_links:
        report.append("No implicit relationships could be inferred from column naming conventions.")

    conn.close()

    # Write report out to text file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))
        
    print(f"Success! Analysis written out to '{output_path}'.")

if __name__ == '__main__':
    analyze_database(DATABASE_FILE, OUTPUT_FILE)
