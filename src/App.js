import "./App.css";
import ConversionRates from "./components/conversion-rates/conversion-rates";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import QualifyToFinalPosition from "./components/qualify-to-final-position/QualifyToFinalPosition";
import Layout from "./components/utils/Layout";
import Home from "./components/utils/Home";
import Footer from "./components/utils/Footer";
import ConstructorDominance from "./components/constructor-dominance/constructor-dominance";
import PodiumFinishes from "./components/podium-finishes/PodiumFinishes";

function App() {
  return (
    <>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Layout />}>
              {/* <Route path="/" element={<Viz1 />} /> */}
              <Route path="/" index element={<Home />} />
              <Route
                path="/qualifying-to-final-position"
                element={<QualifyToFinalPosition />}
              />
              <Route path="/conversion-rates" element={<ConversionRates />} />
              <Route path="/constructor-dominance" element={<ConstructorDominance />} />
              <Route path="/podium-finishes" element={<PodiumFinishes />} />
            </Route>
          </Routes>
        </main>
        <Footer />
      </div>
    </>
  );
}

export default App;
