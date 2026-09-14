import React, { useEffect } from "react";
import { c_dark } from "../a-Graphic/Colors";

const Footer = () => {
  useEffect(() => {
    const part1 = "a.sahindou";
    const part2 = Math.pow(2, 6);
    const part3 = String.fromCharCode(part2);
    const part4 = "agur-dunkerque.org";
    const part5 = part1 + String.fromCharCode(part2) + part4;

    const courrier = document.getElementById("courrier");
    courrier.innerHTML = `<a href="mailto:${part5}">${part5}</a>`;
  }, []);

  return (
    <div className="row mt-5" id="footer">
      <div className="col">
        <div
          className="row justify-content-center pt-4 "
          style={{ backgroundColor: c_dark }}
        >
          <div className="col-11">
            <div className="row justify-content-between">
              <div className="col-md-6 col-12 description">
                <div className="row">
                  <div className="col-12">
                    <p className="mb-1">
                      Ce site est en plein développement. Toute remarque de
                      votre part nous aide à améliorer l'outil pour des chiffres
                      clés clairs.
                    </p>
                  </div>
                </div>

                <div className="row mt-3 mb-5 align-items-center">
                  <div className="col-3">
                    <img
                      src="images/ademe_v.webp"
                      className="img-fluid"
                      style={{ borderRadius: "4px" }}
                      alt="ADEME"
                    />
                  </div>
                  <div className="col-3">
                    <img
                      src="images_webp/AGUR.webp"
                      className="img-fluid"
                      style={{ borderRadius: "4px" }}
                      alt="ADEME"
                    />
                  </div>
                </div>
              </div>

              <div className="col-md-4 col-12">
                <h4 className="mb-2">ressources</h4>
                <p className="mb-1">
                  <a
                    href="https://diagnostic-mobilite.fr/docs/guide_methodologique_Diagnostic_Mobilite.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Guide méthodologique
                  </a>
                </p>
                <p className="mb-1">
                  <a
                    href="https://github.com/maelbds/diagnostic-mobilite"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Répertoire GitHub de l'outil
                  </a>
                </p>

                <h4 className="mb-2 mt-4">contact</h4>
                <p className="mb-4">
                  <span id="courrier"></span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
