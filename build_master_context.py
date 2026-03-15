# One-off script to build MASTER_CONTEXT.txt
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "MASTER_CONTEXT.txt"

EXCLUDE_DIRS = {
    "node_modules", ".venv", ".mypy_cache", ".pytest_cache", ".git",
    "__pycache__", "dist", "build", "coverage", ".next", ".DS_Store", "instance"
}
EXCLUDE_FILES = {
    ".env",  # secrets
    "MASTER_CONTEXTold.txt", "MASTER_CONTEXT.txt", "build_master_context.py",
    "test_hair.jpg", "test_hair2.jpg", "favicon.ico", "logo192.png", "logo512.png",
    "hair_model_4class.pth", "hairscan_dev.db",
    "package-lock.json",  # huge lockfile
    "combined_code.txt",  # duplicate of sources
}
SKIP_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".ttf", ".otf", ".mp4", ".pth", ".h5", ".ico", ".db"}

DESCRIPTIONS = {
    ".gitignore": "Git ignore rules (ignores .env).",
    "requirements.txt": "Python backend dependencies for HairScan.",
    "run.py": "Application entrypoint; boots Flask/SocketIO server.",
    "seed.py": "Seeds the database with demo sellers, products, and users.",
    "test api .txt": "Quick test instructions for API (curl and seed).",
    "app/__init__.py": "Flask app factory; CORS, DB, SocketIO, blueprints, serves React build.",
    "app/models/__init__.py": "Exports User, Scan, Seller, Product models.",
    "app/models/scan.py": "Scan model for hair analysis results and ML metadata.",
    "app/models/seller.py": "Seller and Product models for marketplace.",
    "app/models/user.py": "User model with hair profile fields.",
    "app/routes/__init__.py": "Legacy app factory copy (routes package init).",
    "app/routes/analyse.py": "Hair analysis, live analysis, chat, speech-token API routes.",
    "app/routes/marketplace.py": "Marketplace API ping route.",
    "app/routes/profile.py": "Profile API ping route.",
    "app/routes/sellers.py": "Sellers API ping route.",
    "app/services/__init__.py": "Services package init (empty).",
    "app/services/agent_orchestrator.py": "Multi-agent pipeline: CNNs + discriminator + care agent.",
    "app/services/azure_ml.py": "Azure Custom Vision hair type prediction.",
    "app/services/local_ml.py": "Local MobileNetV3 hair type prediction.",
    "app/sockets/__init__.py": "Sockets package init (empty).",
    "docs/How to start.md": "How to start the frontend (npm start).",
    "docs/STAGE_PROGRESS.md": "Project stage progress log.",
    "docs/make raw data folder.md": "PowerShell command to create data/raw_images folders.",
    "frontend/.gitignore": "Frontend Git ignore (node_modules, build, etc.).",
    "frontend/package.json": "Frontend npm manifest and dependencies.",
    "frontend/README.md": "Create React App readme and scripts.",
    "frontend/tailwind.config.js": "Tailwind CSS config with Kera theme colors.",
    "frontend/public/index.html": "React app HTML template and CDN scripts.",
    "frontend/public/manifest.json": "PWA manifest.",
    "frontend/public/robots.txt": "Robots.txt allow all.",
    "frontend/src/App.css": "App-level CSS and logo animation.",
    "frontend/src/App.jsx": "Root router, bottom nav, home placeholder, routes.",
    "frontend/src/App.test.js": "Default CRA test for App.",
    "frontend/src/index.css": "Tailwind and body styles.",
    "frontend/src/index.js": "React root and reportWebVitals.",
    "frontend/src/logo.svg": "React logo SVG.",
    "frontend/src/reportWebVitals.js": "Web vitals reporting.",
    "frontend/src/setupTests.js": "Jest setup with jest-dom.",
    "frontend/src/pages/KeraChatPage.jsx": "Kera chat UI with voice and TTS.",
    "frontend/src/pages/ResultsPage.jsx": "Scan results: care tips, products, AI data tabs.",
    "frontend/src/pages/ScanPage.jsx": "Camera scan page with MediaPipe, Azure STT/TTS, live analysis.",
    "scripts/clean_data.py": "Batch dataset cleaning with GPT vision (non-interactive).",
    "scripts/cleaning_v2.py": "Interactive dataset cleaning script with GPT vision.",
}

def should_include(p: Path, rel: str) -> bool:
    if rel.startswith(".") and rel != ".gitignore":
        return False
    for part in p.parts:
        if part in EXCLUDE_DIRS:
            return False
    if p.name in EXCLUDE_FILES:
        return False
    if p.suffix.lower() in SKIP_EXT:
        return False
    return True

def build_tree(dir_path: Path, prefix: str = "") -> list[str]:
    lines = []
    try:
        entries = sorted(dir_path.iterdir(), key=lambda e: (e.is_file(), e.name.lower()))
    except OSError:
        return lines
    for i, entry in enumerate(entries):
        if entry.name in EXCLUDE_DIRS or entry.name.startswith(".") and entry.name != ".gitignore":
            continue
        if entry.name == "node_modules" or entry.name == "__pycache__":
            continue
        is_last = i == len(entries) - 1
        connector = "└── " if is_last else "├── "
        if entry.is_file():
            lines.append(prefix + connector + entry.name)
        else:
            lines.append(prefix + connector + entry.name + "/")
            add = "    " if is_last else "│   "
            lines.extend(build_tree(entry, prefix + add))
    return lines

def main():
    tree_lines = [".", ""] + build_tree(ROOT)
    for i in range(2, len(tree_lines)):
        if tree_lines[i].strip():
            tree_lines[i] = tree_lines[i].replace("\\", "/")
    tree_text = "\n".join(tree_lines)

    collected = []
    for r, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".") or d == ".git"]
        if ".git" in dirs:
            dirs.remove(".git")
        rel_root = Path(r).relative_to(ROOT) if r != str(ROOT) else Path(".")
        for f in sorted(files):
            p = Path(r) / f
            rel = (rel_root / f).as_posix()
            if not should_include(p, rel):
                continue
            try:
                raw = p.read_text(encoding="utf-8", errors="replace")
            except Exception as e:
                raw = f"[Could not read: {e}]"
            desc = DESCRIPTIONS.get(rel, "Project file.")
            collected.append((rel, desc, raw))

    collected.sort(key=lambda x: x[0].lower())

    with open(OUT, "w", encoding="utf-8") as out:
        out.write("========================\n")
        out.write("HAIRSCAN PROJECT FILE TREE\n")
        out.write("========================\n\n")
        out.write(tree_text)
        out.write("\n\n")
        out.write("========================\n")
        out.write("FULL PROJECT CONCATENATION\n")
        out.write("========================\n\n")
        for rel, desc, raw in collected:
            out.write("---------- BEGIN FILE: " + rel + " ----------\n")
            out.write("// Description: " + desc + "\n")
            out.write(raw)
            if raw and not raw.endswith("\n"):
                out.write("\n")
            out.write("---------- END FILE: " + rel + " ----------\n\n")

    print("Wrote", OUT, "with", len(collected), "files")

if __name__ == "__main__":
    main()
