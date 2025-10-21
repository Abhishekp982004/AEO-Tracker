import json
import csv
import io

# --- Configuration ---
json_file_path = 'seed_data.json' # Make sure this path is correct
output_csv_path = 'checks_for_supabase.csv'
# ---------------------

def format_supabase_array(py_list):
    """Formats a Python list into Supabase array literal format like {"item1","item2"}."""
    if not py_list:
        return '{}' # Empty array
    # Escape double quotes within items and wrap items in double quotes
    formatted_items = [f'"{str(item).replace('"', '""')}"' for item in py_list]
    return '{' + ','.join(formatted_items) + '}'

try:
    # Read the JSON data
    with open(json_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    checks_data = data.get('checks', [])

    if not checks_data:
        print(f"Error: 'checks' array not found or is empty in {json_file_path}")
    else:
        # Define the exact headers Supabase expects for visibility_checks table
        # Ensure these match your DATABASE_SETUP.md precisely
        headers = [
            'id', 'projectId', 'engine', 'keyword', 'position', 'presence',
            'answerSnippet', 'citationsCount', 'observedUrls',
            'competitorsMentioned', 'timestamp'
            # Note: 'createdAt' usually defaults to NOW() in Supabase,
            # so we don't strictly need to include it unless the seed data has specific values.
            # Adjust if your seed data *requires* a specific createdAt.
        ]

        # Use io.StringIO for cleaner CSV writing, especially with newlines
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=headers, quoting=csv.QUOTE_MINIMAL)

        writer.writeheader()

        for check in checks_data:
            # Prepare row data, ensuring all expected headers are present
            row = {header: check.get(header) for header in headers}

            # Handle potential None values for integer/boolean before formatting
            if row['position'] is None:
                row['position'] = '' # Use empty string for NULL integer
            if row['citationsCount'] is None:
                row['citationsCount'] = 0 # Default to 0 if missing

            # Correctly format the array columns
            row['observedUrls'] = format_supabase_array(check.get('observedUrls', []))
            row['competitorsMentioned'] = format_supabase_array(check.get('competitorsMentioned', []))

            # Format boolean for CSV (True -> true, False -> false)
            row['presence'] = str(row['presence']).lower() if row['presence'] is not None else ''


            # Write the processed row
            writer.writerow(row)

        # Write the buffer content to the actual file
        with open(output_csv_path, 'w', newline='', encoding='utf-8') as f:
            f.write(output.getvalue())

        print(f"Successfully created '{output_csv_path}' with correct Supabase formatting.")

except FileNotFoundError:
    print(f"Error: Could not find the JSON file at {json_file_path}")
except json.JSONDecodeError:
    print(f"Error: Could not decode JSON from {json_file_path}. Check if it's valid JSON.")
except Exception as e:
    print(f"An unexpected error occurred: {e}")