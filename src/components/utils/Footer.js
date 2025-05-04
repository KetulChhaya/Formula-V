import { FaFlagCheckered } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-red-800 to-black text-white relative overflow-hidden">
      {/* Winning stripes */}
      <div className="absolute top-0 left-0 w-full h-2 bg-white">
        <div className="w-1/4 h-full bg-white inline-block"></div>
        <div className="w-1/4 h-full bg-white inline-block"></div>
        <div className="w-1/4 h-full bg-white inline-block"></div>
        <div className="w-1/4 h-full bg-white inline-block"></div>
      </div>

      <div className="container mx-auto py-8 px-4 mt-5 flex flex-col items-center gap-4">
        {/* Department Name with Logo */}
        <div className="flex items-center gap-3 text-2xl font-bold">
          <FaFlagCheckered className="text-white text-3xl" />
          <span>Formula V</span>
        </div>

        {/* Team Members */}
        <div className="flex flex-wrap justify-center gap-6 text-lg font-medium mt-2">
          <span className="hover:text-gray-300 transition">Aditya</span>
          <span>o</span>
          <span className="hover:text-gray-300 transition">Kartikay</span>
          <span>o</span>
          <span className="hover:text-gray-300 transition">Ketul</span>
          <span>o</span>
          <span className="hover:text-gray-300 transition">Sunny</span>
          <span>o</span>
          <span className="hover:text-gray-300 transition">Tanmay</span>
        </div>

        {/* Dataset Reference */}
        <p className="text-sm text-gray-300 mt-4">
          Dataset:{" "}
          <a
            href="https://www.kaggle.com/datasets/rohanrao/formula-1-world-championship-1950-2020"
            className="underline hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            Formula 1 World Championship (1950 - 2024)
          </a>
        </p>

        {/* Bottom Text */}
        <p className="text-sm text-gray-300 mt-2">
          © {new Date().getFullYear()} Formula V Racing. All rights reserved.
        </p>
      </div>
    </footer>
  );
}