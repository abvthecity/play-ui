import { Slider } from "@base-ui/react/slider";
import type { ReactElement } from "react";

/** A labelled slider for a demo's setting, showing its value with a unit. */
export function RangeControl(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}): ReactElement {
  const { label, value, min, max, step = 1, unit = "", onChange } = props;

  return (
    <Slider.Root
      className="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onValueChange={(next) => onChange(next)}
    >
      <Slider.Label className="segmented-label">{label}</Slider.Label>
      <Slider.Control className="range-control">
        <Slider.Track className="range-track">
          <Slider.Indicator className="range-indicator" />
          <Slider.Thumb className="range-thumb" aria-label={label} />
        </Slider.Track>
      </Slider.Control>
      <Slider.Value className="range-value">
        {(formatted) => `${formatted.join("")}${unit}`}
      </Slider.Value>
    </Slider.Root>
  );
}
