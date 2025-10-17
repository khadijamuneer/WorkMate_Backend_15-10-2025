import React, { useState } from "react";

function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a PDF or DOCX file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/resume/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setExtractedText(data.extracted_text);
      } else {
        alert(data.detail || "Failed to process file");
      }
    } catch (err) {
      alert("Error uploading file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 text-center">
      <h2 className="text-2xl font-bold mb-4">Upload Your Resume</h2>

      <input
        type="file"
        accept=".pdf,.docx"
        onChange={handleFileChange}
        className="border p-2 rounded mb-4"
      />

      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded ml-2"
      >
        {loading ? "Uploading..." : "Upload and Extract"}
      </button>

      {/* Always show Optimize button */}
      <a
        href="/resume-generator"
        className={`inline-block mt-4 px-4 py-2 rounded ${
          extractedText ? "bg-green-600 text-white" : "bg-gray-400 text-gray-200"
        }`}
      >
        Fill Manually
      </a>

      {/* Show extracted text if available */}
      {extractedText && (
        <div className="mt-6 text-left">
          <h3 className="text-xl font-semibold mb-2">Extracted Text:</h3>
          <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap">
            {extractedText}
          </pre>
        </div>
      )}
    </div>
  );
}

export default ResumeUpload;