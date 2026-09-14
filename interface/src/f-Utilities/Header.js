import React from "react";

// Header pouvant afficher jusqu'à 3 noms verticalement
const Header = ({ name, names }) => {
  // Support rétro-compatible : si "name" est un tableau on l'utilise comme "names"
  let list = [];
  if (Array.isArray(names)) list = names.slice(0, 3);
  else if (Array.isArray(name)) list = name.slice(0, 3);

  const singleName = !list.length && typeof name === "string" ? name : null;

  return (
    <div className="row header ">
      <div className="col">
        <div className="row ">
          <div className="col-11">
            <div className="row justify-content-between">
              <div className="col-2">
                <a href="#">
                  <img
                    alt="logo de l'agence"
                    src="images_webp/AGUR.webp"
                    className="img-fluid"
                    style={{ borderRadius: "4px" }}
                  />
                </a>
              </div>
              <div className="col-4 d-flex align-items-center justify-content-end">
                {list.length ? (
                  <ul
                    className="list-unstyled mb-0 text-end"
                    style={{ lineHeight: 1.1 }}
                  >
                    {list.map((n, i) => (
                      <li key={i}>
                        <h5
                          className="mt-1 mb-1"
                          style={{ fontSize: "1.1rem" }}
                        >
                          {n}
                        </h5>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <h3 className="mt-1">{singleName}</h3>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
