import React, { useState, useEffect } from "react";
import axios from "axios";

const JobsPage = () => {
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingMatched, setViewingMatched] = useState(true);

  // Fetch matched jobs for the logged-in user
  useEffect(() => {
    const fetchMatchedJobs = async () => {
      const email = localStorage.getItem("email"); // <-- Make sure email is stored on login
      if (!email) return;

      setLoading(true);
      try {
        const res = await axios.get(
          `http://localhost:8000/jobs/match?email=${encodeURIComponent(email)}`
        );
        setJobs(res.data.jobs);
        setViewingMatched(true);
      } catch (err) {
        console.error("Error fetching matched jobs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchedJobs();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setJobs([]);

    try {
      const res = await axios.get(
        `http://localhost:8000/jobs/search?query=${encodeURIComponent(query)}`
      );
      setJobs(res.data.jobs);
      setViewingMatched(false);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        {viewingMatched ? "Recommended Jobs for You" : "Job Search"}
      </h1>

      <form onSubmit={handleSearch} className="flex justify-center mb-8">
        <input
          type="text"
          placeholder="Search for jobs (e.g. Data Scientist, UI Designer)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-gray-300 rounded-l-lg px-4 py-2 w-2/3 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-r-lg hover:bg-blue-700 transition"
        >
          Search
        </button>
      </form>

      {loading && (
        <div className="flex justify-center items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="ml-4 text-lg text-gray-600">
            {viewingMatched
              ? "Fetching matched jobs..."
              : "Scraping jobs, please wait..."}
          </p>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                {job.title}
              </h2>
              <p className="text-gray-600 mb-1">
                <strong>Company:</strong> {job.company || "N/A"}
              </p>
              <p className="text-gray-600 mb-1">
                <strong>Location:</strong> {job.location || "Not specified"}
              </p>
              <p className="text-gray-700 mt-2 mb-3">
                {job.preview_desc || job.description || "No description available."}
              </p>
              <p className="text-gray-500 text-sm mb-2">
                <strong>Date Posted:</strong> {job.date_posted || "Unknown"}
              </p>

              {job.skills && job.skills.length > 0 && (
                <p className="text-gray-700 mb-3">
                  <strong>Skills:</strong> {job.skills.join(", ")}
                </p>
              )}

              {job.score !== undefined && (
                <p className="text-green-700 font-semibold mb-3">
                  Match Score: {(job.score * 100).toFixed(1)}%
                </p>
              )}

              {job.link && (
                <a
                  href={job.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  View Job
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && jobs.length === 0 && (
        <p className="text-center text-gray-500 mt-10">
          {viewingMatched
            ? "No matched jobs available yet."
            : "No jobs to display. Try searching above!"}
        </p>
      )}
    </div>
  );
};

export default JobsPage;
