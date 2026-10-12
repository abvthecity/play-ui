import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import type { ReactElement } from "react";

export interface SegmentedOption<Value extends string> {
  value: Value;
  label: string;
}

/**
 * A row of buttons where exactly one is pressed, for a demo's settings. The
 * arrow keys move between the options; pressing the pressed one keeps it.
 */
export function SegmentedControl<Value extends string>(props: {
  label: string;
  value: Value;
  options: readonly SegmentedOption<Value>[];
  onChange: (value: Value) => void;
}): ReactElement {
  const { label, value, options, onChange } = props;

  return (
    <div className="segmented">
      <span className="segmented-label">{label}</span>
      <ToggleGroup
        aria-label={label}
        className="segmented-group"
        value={[value]}
        onValueChange={(next: Value[]) => {
          const [chosen] = next;

          if (chosen) onChange(chosen);
        }}
      >
        {options.map((option) => (
          <Toggle key={option.value} value={option.value} className="segmented-item">
            {option.label}
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  );
}
