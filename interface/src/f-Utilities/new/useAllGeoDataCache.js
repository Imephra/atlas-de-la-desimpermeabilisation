import { useState, useEffect } from "react";
import GeoIndexedDB from "./GeoIndexedDB";
import * as d3 from "d3";

export const useAllGeoDataCache = (cog = "2023") => {
  const [data, setData] = useState(null);
  const [emd, setEmd] = useState({ emd_added: [], emd_not_added: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Récupération depuis IndexedDB
        const cached = await GeoIndexedDB.getAllGeo();
        if (cached) {
          setData(cached.data);
          setEmd(cached.emd);
          setLoading(false);
          return;
        }

        // Chargement des données depuis le serveur
        const font = new window.FontFace(
          "Source Sans Pro",
          "url(https://fonts.gstatic.com/s/sourcesanspro/v22/6xK3dSBYKcSV-LCoeQqfX1RYOo3qOK7l.woff2)",
          { weight: 400 }
        );

        const files = await Promise.all([
          d3.json(`geography/${cog}/topo_com_with_attr.json`),
          d3.json(`geography/${cog}/topo_com_with_attr_light.json`),
          d3.csv(`geography/${cog}/communes_attr.csv`),
          d3.csv(`geography/${cog}/epci_attr.csv`),
          d3.csv(`geography/${cog}/arrondissements_attr.csv`),
          d3.csv(`geography/${cog}/departements_attr.csv`),
          d3.csv(`geography/${cog}/regions_attr.csv`),
          d3.csv(`geography/${cog}/aav_attr.csv`),
          d3.json(`geography/${cog}/emd.json`),
          d3.json("tiles_style/custom_epure.json"),
          d3.json("tiles_style/custom_names.json"),
          font.load(),
        ]);

        const geoData = {
          com_topo: files[0],
          com_topo_light: files[1],
          communes_attr: d3.index(files[2], (d) => d.geo_code),
          epci_attr: d3.index(files[3], (d) => d.epci),
          arr_attr: d3.index(files[4], (d) => d.arr),
          dep_attr: d3.index(files[5], (d) => d.dep),
          reg_attr: d3.index(files[6], (d) => d.reg),
          aav_attr: d3.index(files[7], (d) => d.aav),
          style_epure: files[9],
          style_names: files[10],
        };

        const emdData = files[8];
        await GeoIndexedDB.setAllGeo({ data: geoData, emd: emdData });
        setData(geoData);
        setEmd(emdData);
      } catch (err) {
        setError(err.message || "Erreur de chargement des données");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const refresh = async () => {
    try {
      setLoading(true);
      await GeoIndexedDB.clearAllGeo();
      const font = new window.FontFace(
        "Source Sans Pro",
        "url(https://fonts.gstatic.com/s/sourcesanspro/v22/6xK3dSBYKcSV-LCoeQqfX1RYOo3qOK7l.woff2)",
        { weight: 400 }
      );

      const files = await Promise.all([
        d3.json(`geography/${cog}/topo_com_with_attr.json`),
        d3.json(`geography/${cog}/topo_com_with_attr_light.json`),
        d3.csv(`geography/${cog}/communes_attr.csv`),
        d3.csv(`geography/${cog}/epci_attr.csv`),
        d3.csv(`geography/${cog}/arrondissements_attr.csv`),
        d3.csv(`geography/${cog}/departements_attr.csv`),
        d3.csv(`geography/${cog}/regions_attr.csv`),
        d3.csv(`geography/${cog}/aav_attr.csv`),
        d3.json(`geography/${cog}/emd.json`),
        d3.json("tiles_style/custom_epure.json"),
        d3.json("tiles_style/custom_names.json"),
        font.load(),
      ]);

      const geoData = {
        com_topo: files[0],
        com_topo_light: files[1],
        communes_attr: d3.index(files[2], (d) => d.geo_code),
        epci_attr: d3.index(files[3], (d) => d.epci),
        arr_attr: d3.index(files[4], (d) => d.arr),
        dep_attr: d3.index(files[5], (d) => d.dep),
        reg_attr: d3.index(files[6], (d) => d.reg),
        aav_attr: d3.index(files[7], (d) => d.aav),
        style_epure: files[9],
        style_names: files[10],
      };

      const emdData = files[8];
      await GeoIndexedDB.setAllGeo({ data: geoData, emd: emdData });
      setData(geoData);
      setEmd(emdData);
    } catch (err) {
      setError(err.message || "Erreur de rechargement");
    } finally {
      setLoading(false);
    }
  };

  return { data, emd, loading, error, refresh };
};
