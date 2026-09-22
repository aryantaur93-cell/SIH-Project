with open("frontend/index.html", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "section id=" in line or "class=\"section-panel" in line or "Verification" in line:
        print(f"{i+1}: {line.strip()[:100]}")
