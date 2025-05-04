import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
  const tiles = [
    {
      title: "Conversion Rates",
      description: "From pole to podium: who kept their cool under pressure?",
      route: "/conversion-rates",
    },
    {
      title: "Winning Margins",
      description:
        "Race to the Finish: Uncover the Thrilling Margins of Victory in Formula 1’s Closest Battles!",
      route: "/winning-margins",
    },
    {
      title: "Qualifying to Final Perfomance",
      description:
        "From grid to glory: how drivers climb or fall during the race.",
      route: "/qualifying-to-final-position",
    },
    {
      title: "Championship Battle Trends",
      description: "Watch the title fight unfold race by race!",
      route: "/championship-battle-trends",
    },
    {
      title: "Driver Contributions",
      description: "Team players or lone wolves: who drove the points home?",
      route: "/driver-contributions",
    },
    {
      title: "Podium Finishes",
      description: "Spotlight on the stars: every podium, every race!",
      route: "/podium-finishes",
    },
    {
      title: "Constructor Dominance",
      description: "See which teams ruled the track each season!",
      route: "/constructor-dominance",
    },

    {
      title: "Career Progression",
      description: "Chart a driver's rise to fame, season by season.",
      route: "/career-progression",
    },
    {
      title: "Track Performance",
      description: "Discover a driver's favorite battlegrounds!",
      route: "/track-stats",
    },
    {
      title: "DNF Heatmap",
      description: "When the going got tough: teams' breakdown battles.",
      route: "/dnf-heatmap",
    },
  ];
  return (
    <div
      className="bg-gradient-to-r from-black to-slate-900 text-white font-[Formula1] m-auto"
      style={{ minHeight: "175vh" }}
    >
      <div className="max-w-7xl m-auto pt-10">
        <div className="text-white-500 text-center mb-10 mt-5">
          <h1 className="text-4xl font-bold mb-6">
            🏁 Welcome to Formula V: A Visual Journey Through Formula 1
          </h1>
          <p className="text-xl mb-4">
            Formula 1 is more than just lap times and podiums — it’s a complex,
            high-speed narrative of performance, strategy, and resilience. Formula V
            is an interactive data visualization platform designed for
            F1 fans and enthusiasts seeking to dig deeper into the dynamics of
            the sport.
            <br />
            <br />
            Through a series of intuitive, visually-rich dashboards, our system
            helps you:
            <br />
            <ul className="list-disc list-inside text-left mx-auto max-w-3xl">
              <li>
                🔍 Compare driver and team performances across races and seasons
              </li>
              <li>
                📊 Visualize key strategies like qualifying results, race-day
                positions, and pit reliability
              </li>
              <li>
                ⏱️ Understand race dynamics, including overtakes, gaps, and
                breakdown trends
              </li>
              <li>
                📈 Spot patterns in driver consistency, team dominance, and
                track performance
              </li>
              <li>
                🎥 Replay championship battles and race outcomes from a fresh,
                analytical perspective
              </li>
            </ul>
          </p>
        </div>

        <hr className="border-t-2 border-red-500 mb-5" />

        <h1 className="text-3xl font-bold mt-5 mb-5 text-white-500 text-center uppercase">
          F1 Data Visualizations
        </h1>

        <hr className="border-t-2 border-red-500 mt-5 mb-10" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiles.map((tile) => (
            <Link to={tile.route} key={tile.title}>
              <div className="group bg-slate hover:bg-red-600 transition-all duration-300 ease-in-out border-2 border-red-500 rounded-xl p-6 shadow-lg flex flex-col justify-between h-48 hover:scale-105">
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
        </div>
      </div>
    </div>
  );
};

export default Home;
