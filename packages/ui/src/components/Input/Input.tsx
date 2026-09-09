import {
  FieldError,
  Input as AriaInput,
  Label,
  Text,
  TextField,
  type TextFieldProps,
} from "react-aria-components";

export type InputSize = "sm" | "md" | "lg";

export interface InputProps
  extends Omit<TextFieldProps, "className" | "children"> {
  label: string;
  description?: string;
  errorMessage?: string;
  placeholder?: string;
  size?: InputSize;
  className?: string;
}

export function Input({
  label,
  description,
  errorMessage,
  placeholder,
  size = "md",
  isInvalid,
  className,
  ...props
}: InputProps) {
  const classes = [
    "igx-input-field",
    `igx-input-field--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const invalid = isInvalid ?? errorMessage !== undefined;

  return (
    <TextField {...props} isInvalid={invalid} className={classes}>
      <Label className="igx-input-field__label">
        {label}
      </Label>

      <AriaInput
        className="igx-input-field__control"
        {...(placeholder !== undefined ? { placeholder } : {})}
      />

      {description ? (
        <Text
          slot="description"
          className="igx-input-field__description"
        >
          {description}
        </Text>
      ) : null}

      {errorMessage ? (
        <FieldError className="igx-input-field__error">
          {errorMessage}
        </FieldError>
      ) : null}
    </TextField>
  );
}
