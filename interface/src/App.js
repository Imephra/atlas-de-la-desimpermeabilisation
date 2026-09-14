import { useState, useContext, useEffect, Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import Header from "./f-Utilities/Header";
import { MapDataContext } from "./context/MapDataContext";
import { getCache, setCache, clearCache } from "./f-Utilities/new/cache";
import { useAllGeoDataCache } from "./f-Utilities/new/useAllGeoDataCache";
import routes from "./routes";

const Loader = () => (
  <div className="row">
    <div className="col">
      <Header />
      <div className="row mt-5"></div>
      <div className="row justify-content-center mt-5">
        <div className="col-auto">
          <div className="spinner-grow" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      </div>
      <p className="mt-3">Chargement des données...</p>
    </div>
  </div>
);

// Composant wrapper pour pouvoir utiliser useNavigate dans le corps principal
const AppInner = () => {
  const [selection, setSelection] = useState(null);
  const { setSelected } = useContext(MapDataContext);
  const navigate = useNavigate();

  // Vérifie le cache au démarrage
  useEffect(() => {
    const cachedSelection = getCache();
    if (cachedSelection) {
      setSelection(cachedSelection);
    }
  }, []);

  const linkToSelection = (title, geo_codes) => {
    setSelection({ name: title, geo_codes });
    setCache({ name: title, geo_codes });
    navigate("/diagnostic", { replace: true });
  };

  const resetSelection = () => {
    setSelected(new Set());
    setSelection(null);
    clearCache();
    navigate("/", { replace: true });
  };

  const { data, emd, loading, error } = useAllGeoDataCache("2023");

  // Génération dynamique des routes
  const dynamicRoutes = routes.map((route, index) => (
    <Route
      key={index}
      path={route.path}
      element={
        <Suspense fallback={<Loader />}>
          {route.path === "/diagnostic" ? (
            selection && data ? (
              <route.element
                name={selection.name || "Territoire multiple"}
                geo_codes={selection.geo_codes}
                zones={selection.zones}
                styles={{
                  style_epure: data.style_epure,
                  style_names: data.style_names,
                }}
                com_topo={data.com_topo}
                communes_attr={data.communes_attr}
                epci_attr={data.epci_attr}
                resetSelection={resetSelection}
              />
            ) : (
              <Navigate to="/" replace />
            )
          ) : (
            <route.element loadTerritory={linkToSelection} />
          )}
        </Suspense>
      }
    />
  ));

  return (
    <>
      <Routes>{dynamicRoutes}</Routes>
    </>
  );
};

const App = () => (
  <Router>
    <Suspense fallback={<Loader />}>
      <AppInner />
    </Suspense>
  </Router>
);

export default App;
