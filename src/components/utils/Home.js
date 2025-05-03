import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
  const tiles = [
    {
      title: "Constructor Dominance",
      description: "How constructors have performed over the years.",
      route: "/constructor-dominance",
    },
    {
      title: "Conversion Rates",
      description: "Percentage of drivers qualifying in the top 10 who finished in the top 10 each year",
      route: "/conversion-rates",
    },
    {
      title: "Championship Battle Trends",
      description: "How drivers have performed in the championship battle",
      route: "/championship-battle-trends",
    },
    {
      title: "Qualifying to Final Perfomance",
      description: "How drivers moved from grid to finish – visualized.",
      route: "/qualifying-to-final-position",
    },
    {
      title: "Podium Finishes",
      description:
        "Zoom into podium finishes by driver, position, and location.",
      route: "/podium-finishes",
    },
    {
      title: "Career Progression",
      description: "How drivers have progressed through their careers",
      route: "/career-progression",
    },
    {
      title: "Track Progression",
      description: "How the drivers have performed on tracks over the years",
      route: "/TrackStats",
    },
  
  ];
  return (
    <div className="bg-black text-white font-sans m-auto" style={{minHeight: "69.5vh"}}>
      <div className="max-w-7xl m-auto pt-10">
      <h1 className="text-4xl font-bold mb-10 text-white-500 text-center uppercase">
        F1 Data Visualizations
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiles.map((tile) => (
          <Link to={tile.route} key={tile.title}>
            <div className="group bg-gray-900 hover:bg-red-600 transition-all duration-300 ease-in-out border-2 border-red-500 rounded-xl p-6 shadow-lg flex flex-col justify-between h-48 hover:scale-105">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-white">
                  {tile.title}
                </h2>
                <p className="text-sm text-gray-400 group-hover:text-white">
                  {tile.description}
                </p>
              </div>
              <div className="flex justify-end mt-4">
                <span className="text-red-400 group-hover:text-white font-bold tracking-wider">
                  ➜ Explore
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div></div>
    </div>
  );
};

export default Home;
