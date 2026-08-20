import { JSXElement } from "solid-js";

export function GokuHairBorder(props: {
  children?: JSXElement;
  hovered?: boolean;
  size: number;
  offset?: number;
}) {
  const size = props.size;
  const extra = size * 0.55;

  return (
    <img
      class="goku-hair"
      style={{
        position: "absolute",
        width: size + extra * 2 + "px",
        height: size + extra * 2 + "px",
        left: -extra + "px",
        top: -extra + (props.offset || 0) * size + "px",
        "z-index": "1111",
        "pointer-events": "none",
        "mix-blend-mode": "lighten",
        "object-fit": "contain"
      }}
      src="/borders/gokuBaner.png"
      alt=""
    />
  );
}
