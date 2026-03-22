import os
import sys
import glob

def main():
    if len(sys.argv) < 2:
        print("Uso: python set_api_url.py <NUEVA_URL_DE_RENDER>")
        print("Ejemplo: python set_api_url.py https://codexar-api-abc1.onrender.com/api")
        return

    new_url = sys.argv[1]
    # Eliminar barra final si existe
    if new_url.endswith("/"):
        new_url = new_url[:-1]

    # Rutas para buscar JS files
    services_path = os.path.join(os.path.dirname(__file__), "src", "services", "*.js")
    js_files = glob.glob(services_path)

    old_urls = [
        "http://127.0.0.1:8000/api",
        "http://localhost:8000/api"
    ]

    count = 0
    for file_path in js_files:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        updated = False
        for old in old_urls:
            if old in content:
                content = content.replace(old, new_url)
                updated = True
                
        if updated:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"Actualizado: {os.path.basename(file_path)}")

    print(f"\n¡Listo! {count} archivos actualizados con la URL: {new_url}")

if __name__ == "__main__":
    main()
