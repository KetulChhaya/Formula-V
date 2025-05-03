import "./App.css";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Layout from "./components/utils/Layout";
import Home from "./components/utils/Home";
import Footer from "./components/utils/Footer";
import ConversionRates from "./components/conversion-rates/conversion-rates";
import ConstructorDominance from "./components/constructor-dominance/constructor-dominance";
import PodiumFinishes from "./components/podium-finishes/PodiumFinishes";
import QualifyToFinalPosition from "./components/qualify-to-final-position/QualifyToFinalPosition";
import ChampionshipBattleTrends from "./components/championship-battle-trends/ChampionshipBattleTrends";
import CareerProgression from "./components/career-pprogression/CareerProgression";
import TrackPerformance from "./components/Track-Stats/TrackPerformance";
import PitStopEfficiencyImpact from "./components/pit-stop-efficiency-impact/PitStopEfficiencyImpact";
import DnfHeatmap from "./components/dnf-heatmap/DnfHeatmap";
import DriverContributions from "./components/driver-contributions/DriverContributions";
import WinningMargins from "./components/winning-margins/WinningMargins";

function App() {
  return (
    <>
      <div className="flex flex-col min-h-screen">
        <Navbar />

        {/* <main className="flex-grow"> */}
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route path="/" index element={<Home />} />
            <Route
              path="/qualifying-to-final-position"
              element={<QualifyToFinalPosition />}
            />
            <Route path="/conversion-rates" element={<ConversionRates />} />
            <Route
              path="/constructor-dominance"
              element={<ConstructorDominance />}
            />
            <Route path="/podium-finishes" element={<PodiumFinishes />} />
            <Route
              path="/championship-battle-trends"
              element={<ChampionshipBattleTrends />}
            />
            <Route path="/career-progression" element={<CareerProgression />} />
            <Route path="/track-stats" element={<TrackPerformance />} />
            <Route
              path="/pitstop-efficiency-impact"
              element={<PitStopEfficiencyImpact />}
            />
            <Route path="/dnf-heatmap" element={<DnfHeatmap />} />
            <Route
              path="/driver-contributions"
              element={<DriverContributions />}
            />
              <Route path="/winning-margins" element={<WinningMargins />} />
          </Route>
        </Routes>
        {/* </main> */}
        <Footer />
      </div>
    </>
  );
}

export default App;
