# scan_database.py
import os
import django
import json
from datetime import datetime

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection
from django.apps import apps
from django.db.models import Field, ManyToManyField, ForeignKey, OneToOneField, ManyToManyRel, ManyToOneRel


def get_all_table_info():
    """Get complete information about all tables in the database"""
    
    # Get all tables from SQLite
    with connection.cursor() as cursor:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        table_names = [row[0] for row in cursor.fetchall()]
    
    # Get all Django models
    all_models = apps.get_models()
    
    # Create a mapping of model names to their fields
    model_fields = {}
    model_relationships = {}
    model_verbose_names = {}
    
    for model in all_models:
        model_name = model._meta.db_table
        if model_name in table_names:
            # Get verbose name
            verbose_name = model._meta.verbose_name.title()
            verbose_name_plural = model._meta.verbose_name_plural.title()
            
            # Get all fields
            fields = []
            relationships = {}
            
            for field in model._meta.get_fields():
                # Skip reverse relations that don't have a direct field
                if isinstance(field, (ManyToManyRel, ManyToOneRel)):
                    continue
                
                field_info = {
                    'name': field.name,
                    'type': field.get_internal_type(),
                    'null': field.null if hasattr(field, 'null') else True,
                    'blank': field.blank if hasattr(field, 'blank') else True,
                    'default': str(field.default) if field.default is not None and not callable(field.default) else None,
                    'help_text': field.help_text if hasattr(field, 'help_text') else '',
                }
                
                # Check if it's a relationship field
                if isinstance(field, ForeignKey):
                    target_table = field.remote_field.model._meta.db_table
                    field_info['foreign_key'] = target_table
                    relationships[field.name] = target_table
                elif isinstance(field, OneToOneField):
                    target_table = field.remote_field.model._meta.db_table
                    field_info['one_to_one'] = target_table
                    relationships[field.name] = target_table
                elif isinstance(field, ManyToManyField):
                    target_table = field.remote_field.model._meta.db_table
                    field_info['many_to_many'] = target_table
                    relationships[field.name] = target_table
                
                # Add field type description
                if field_info['type'] == 'CharField' and hasattr(field, 'max_length'):
                    field_info['max_length'] = field.max_length
                elif field_info['type'] in ['DecimalField', 'FloatField']:
                    field_info['max_digits'] = field.max_digits if hasattr(field, 'max_digits') else None
                    field_info['decimal_places'] = field.decimal_places if hasattr(field, 'decimal_places') else None
                elif field_info['type'] in ['DateField', 'DateTimeField']:
                    field_info['auto_now'] = field.auto_now if hasattr(field, 'auto_now') else False
                    field_info['auto_now_add'] = field.auto_now_add if hasattr(field, 'auto_now_add') else False
                
                fields.append(field_info)
            
            model_fields[model_name] = fields
            model_relationships[model_name] = relationships
            model_verbose_names[model_name] = {
                'name': verbose_name,
                'plural': verbose_name_plural
            }
    
    # Get actual column info from SQLite for tables without Django models
    for table_name in table_names:
        if table_name not in model_fields:
            try:
                with connection.cursor() as cursor:
                    cursor.execute(f"PRAGMA table_info({table_name})")
                    columns = cursor.fetchall()
                    
                    fields = []
                    for col in columns:
                        fields.append({
                            'name': col[1],
                            'type': col[2],
                            'null': bool(col[3]),
                            'default': col[4],
                            'primary_key': bool(col[5]),
                        })
                    model_fields[table_name] = fields
                    model_verbose_names[table_name] = {
                        'name': table_name.replace('_', ' ').title(),
                        'plural': table_name.replace('_', ' ').title() + 's'
                    }
            except Exception as e:
                print(f"Warning: Could not get info for table {table_name}: {e}")
    
    return {
        'tables': table_names,
        'fields': model_fields,
        'relationships': model_relationships,
        'verbose_names': model_verbose_names,
        'generated_at': datetime.now().isoformat(),
        'total_tables': len(table_names)
    }


def save_to_json_file():
    """Save the complete table structure to a JSON file"""
    
    data = get_all_table_info()
    
    # Save to file
    output_file = 'database_schema.json'
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    
    print(f"✅ Database schema saved to: {output_file}")
    print(f"   Total tables: {data['total_tables']}")
    print(f"   Generated at: {data['generated_at']}")
    
    # Print summary
    print("\n📊 Table Summary:")
    for table in data['tables']:
        field_count = len(data['fields'].get(table, []))
        verbose_name = data['verbose_names'].get(table, {}).get('name', table)
        print(f"   - {verbose_name} ({table}): {field_count} fields")
    
    return data


def save_as_text_file():
    """Save the schema as a readable text file"""
    
    data = get_all_table_info()
    
    output_file = 'database_schema.txt'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("="*80 + "\n")
        f.write("📊 DATABASE SCHEMA\n")
        f.write("="*80 + "\n")
        f.write(f"Generated: {data['generated_at']}\n")
        f.write(f"Total Tables: {data['total_tables']}\n\n")
        
        for table in data['tables']:
            verbose_name = data['verbose_names'].get(table, {}).get('name', table)
            fields = data['fields'].get(table, [])
            relationships = data['relationships'].get(table, {})
            
            f.write(f"\n📋 {verbose_name} ({table})\n")
            f.write("-" * 60 + "\n")
            
            f.write("   Fields:\n")
            for field in fields:
                field_name = field['name']
                field_type = field['type']
                null_info = "NULL" if field.get('null', True) else "NOT NULL"
                
                # Check if it's a relationship
                relation_info = ""
                if 'foreign_key' in field:
                    relation_info = f" → {field['foreign_key']} (FK)"
                elif 'one_to_one' in field:
                    relation_info = f" → {field['one_to_one']} (1:1)"
                elif 'many_to_many' in field:
                    relation_info = f" → {field['many_to_many']} (M2M)"
                
                f.write(f"      - {field_name}: {field_type} ({null_info}){relation_info}\n")
            
            if relationships:
                f.write(f"   Relationships: {len(relationships)}\n")
                for fk, target in relationships.items():
                    f.write(f"      - {fk} → {target}\n")
            
            f.write(f"   Total fields: {len(fields)}\n")
    
    print(f"✅ Text file saved to: {output_file}")
    return output_file


def generate_report_builder_config():
    """Generate configuration for the report builder using actual database schema"""
    
    data = get_all_table_info()
    
    table_configs = []
    
    for table in data['tables']:
        # Skip system tables that shouldn't appear in reports
        if table.startswith('django_') or table.startswith('auth_') or table.startswith('sqlite_'):
            continue
        
        fields = data['fields'].get(table, [])
        
        if not fields:
            continue
        
        verbose_name = data['verbose_names'].get(table, {}).get('name', table)
        
        field_list = []
        for field in fields:
            field_entry = {
                'name': field['name'],
                'label': field['name'].replace('_', ' ').title(),
                'type': field['type'].lower(),
                'null': field.get('null', True),
                'is_relation': 'foreign_key' in field or 'one_to_one' in field or 'many_to_many' in field,
            }
            
            if 'foreign_key' in field:
                field_entry['foreign_key'] = field['foreign_key']
            elif 'one_to_one' in field:
                field_entry['one_to_one'] = field['one_to_one']
            elif 'many_to_many' in field:
                field_entry['many_to_many'] = field['many_to_many']
            
            field_list.append(field_entry)
        
        table_configs.append({
            'table': table,
            'name': verbose_name,
            'label': verbose_name,
            'fields': field_list,
            'foreign_keys': data['relationships'].get(table, {}),
        })
    
    # Save to JSON
    config_file = 'report_builder_config.json'
    with open(config_file, 'w') as f:
        json.dump(table_configs, f, indent=2, default=str)
    
    print(f"✅ Report builder config saved to: {config_file}")
    print(f"   Total tables available: {len(table_configs)}")
    
    return table_configs


if __name__ == "__main__":
    print("🔍 Scanning database...\n")
    
    try:
        # Save JSON file with full schema
        save_to_json_file()
        
        # Save text file for easy reading
        save_as_text_file()
        
        # Generate report builder config
        generate_report_builder_config()
        
        print("\n✅ All files generated successfully!")
        print("   📄 database_schema.json - Complete JSON schema")
        print("   📄 database_schema.txt - Human readable text file")
        print("   📄 report_builder_config.json - Ready for report builder")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()