"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for dishes, drinks..."
          className="w-full py-2.5 px-4 pl-11 bg-white/95 rounded-full border border-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#bd3838] focus:border-transparent transition-all duration-200 text-sm md:text-base"
        />
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#bd3838] text-white px-3.5 py-1.5 rounded-full text-xs md:text-sm font-medium hover:bg-[#e05a19] transition-colors duration-200"
        >
          Search
        </button>
      </form>
    </div>
  );
}
