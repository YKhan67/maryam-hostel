from pathlib import Path
import re

# Change this only if your frontend is somewhere else
FILE = Path(r"D:\prj\maryam-hostel\frontend\src\pages\UserManagementPage.js")

print("=" * 80)
print("USER MANAGEMENT UPDATE-FLOW INSPECTION")
print("READ ONLY — NO FILES WILL BE MODIFIED")
print("=" * 80)

if not FILE.exists():
    print(f"\nERROR: File not found:\n{FILE}")
    raise SystemExit(1)

text = FILE.read_text(encoding="utf-8")

lines = text.splitlines()

# ------------------------------------------------------------
# 1. Find FormData / append / PUT / PATCH / JSON.stringify
# ------------------------------------------------------------

keywords = [
    "FormData",
    ".append(",
    "JSON.stringify",
    ".put(",
    ".patch(",
    "axios.put",
    "axios.patch",
    "method:",
    "PUT",
    "PATCH",
    "save",
    "handleSubmit",
    "handleSave",
    "updateUser",
    "createUser",
]

print("\n" + "=" * 80)
print("[1] RELEVANT LINES")
print("=" * 80)

hits = []

for i, line in enumerate(lines):
    if any(keyword in line for keyword in keywords):
        hits.append(i)

for i in hits:
    print(f"\n--- line {i + 1} ---")
    start = max(0, i - 3)
    end = min(len(lines), i + 5)

    for n in range(start, end):
        print(f"{n + 1:4}: {lines[n]}")


# ------------------------------------------------------------
# 2. Show complete functions containing FormData
# ------------------------------------------------------------

print("\n" + "=" * 80)
print("[2] FUNCTIONS CONTAINING FORMDATA")
print("=" * 80)

formdata_lines = [
    i for i, line in enumerate(lines)
    if "FormData" in line
]

shown_ranges = []

for index in formdata_lines:

    start = index
    end = index

    # Find likely function start
    while start > 0:
        line = lines[start]

        if (
            re.search(r"\basync\s+\w+\s*\(", line)
            or re.search(r"\bfunction\s+\w+\s*\(", line)
            or re.search(r"^\s*(const|let)\s+\w+\s*=\s*(async\s*)?\(", line)
        ):
            break

        start -= 1

    # Find likely function end
    brace_count = 0
    started = False

    for n in range(start, len(lines)):
        brace_count += lines[n].count("{")
        brace_count -= lines[n].count("}")

        if "{" in lines[n]:
            started = True

        if started and brace_count <= 0:
            end = n
            break

    # Avoid printing same function multiple times
    current_range = (start, end)

    if current_range in shown_ranges:
        continue

    shown_ranges.append(current_range)

    print("\n" + "-" * 80)
    print(f"Lines {start + 1}-{end + 1}")
    print("-" * 80)

    for n in range(start, end + 1):
        print(f"{n + 1:4}: {lines[n]}")


# ------------------------------------------------------------
# 3. Specifically inspect every FormData.append()
# ------------------------------------------------------------

print("\n" + "=" * 80)
print("[3] EVERY FORMDATA.APPEND()")
print("=" * 80)

append_found = False

for i, line in enumerate(lines):

    if ".append(" in line:
        append_found = True

        print(f"\nLine {i + 1}:")
        print(line.strip())

        # Show nearby context
        for n in range(max(0, i - 2), min(len(lines), i + 3)):
            print(f"  {n + 1}: {lines[n]}")

if not append_found:
    print("No .append() calls found.")


# ------------------------------------------------------------
# 4. Look specifically for suspicious array creation
# ------------------------------------------------------------

print("\n" + "=" * 80)
print("[4] POSSIBLE ARRAY/LIST SOURCES")
print("=" * 80)

patterns = [
    r"\[\s*[^]]+\s*\]",
    r"\.map\s*\(",
    r"roles?\s*:",
    r"hostel\s*:",
    r"profile\s*:",
    r"is_active\s*:",
]

for pattern in patterns:

    found = False

    for i, line in enumerate(lines):

        if re.search(pattern, line, re.IGNORECASE):

            if not found:
                print(f"\nPattern: {pattern}")
                found = True

            print(f"{i + 1:4}: {line}")


# ------------------------------------------------------------
# 5. Final diagnostic guidance
# ------------------------------------------------------------

print("\n" + "=" * 80)
print("INSPECTION COMPLETE")
print("=" * 80)

print("""
Look especially for these problems:

1. formData.append("username", [value])
   -> WRONG

2. formData.append("role", [role])
   -> WRONG for DRF ChoiceField

3. formData.append("hostel", [hostel])
   -> WRONG for DRF PrimaryKeyRelatedField

4. formData.append("is_active", [is_active])
   -> WRONG for DRF BooleanField

5. formData.append("profile", JSON.stringify([profile]))
   -> WRONG

Expected:

username  -> scalar string
first_name -> scalar string
role      -> "STUDENT"
hostel    -> primary-key value
is_active -> "true"/"false" or the format already expected by the existing API
profile   -> JSON object, NOT array

DO NOT MODIFY ANYTHING BASED ON THIS OUTPUT YET.
""")