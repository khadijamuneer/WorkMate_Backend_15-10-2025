import os
import subprocess
from jinja2 import Environment, FileSystemLoader

# Path to tectonic.exe
TECTONIC_PATH = r"C:\Users\HP\tectonic.exe"

def escape_ampersands(data):
    if isinstance(data, dict):
        return {k: escape_ampersands(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [escape_ampersands(i) for i in data]
    elif isinstance(data, str):
        return data.replace("&", "\\&")
    return data

def generate_resume(data, output_pdf="resume.pdf"):
    base_dir = os.path.dirname(__file__)
    output_dir = os.path.join(base_dir, "output")
    os.makedirs(output_dir, exist_ok=True)

    # Load and render LaTeX template
    env = Environment(loader=FileSystemLoader(base_dir))
    template = env.get_template("resume_template.tex")
    safe_data = escape_ampersands(data)
    rendered_tex = template.render(**safe_data)

    # Save rendered .tex file
    tex_file = os.path.join(output_dir, "resume.tex")
    pdf_file = os.path.join(output_dir, output_pdf)
    with open(tex_file, "w", encoding="utf-8") as f:
        f.write(rendered_tex)

    # Compile PDF using Tectonic
    try:
        result = subprocess.run(
            [TECTONIC_PATH, tex_file, "--outdir", output_dir],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True
        )
        print(result.stdout.decode())
    except subprocess.CalledProcessError as e:
        print("=== Tectonic compilation failed ===")
        print(e.stdout.decode())
        print(e.stderr.decode())
        #raise Exception("PDF generation failed. Check Tectonic logs.")

    # Rename output if necessary
    generated_pdf = os.path.join(output_dir, "resume.pdf")
    if not os.path.exists(generated_pdf):
        # Tectonic might output with .pdf automatically from filename
       #generated_pdf = tex_file.replace(".tex", ".pdf")
       raise FileNotFoundError("PDF was not generated")

    return generated_pdf