"use client";

import { useEffect, useState } from "react";

export function InQbetaLogo() {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    fetch("/images/inqbeta.svg")
      .then((response) => response.text())
      .then(setSvg)
      .catch(() => setSvg(""));
  }, []);

  if (!svg) {
    return <div className="h-9 w-36" aria-label="inQbeta" />;
  }

  return (
    <div
      className="inqbeta-logo h-11 w-44 sm:h-12 sm:w-48"
      role="img"
      aria-label="inQbeta"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
