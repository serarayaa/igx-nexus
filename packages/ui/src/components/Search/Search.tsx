import { Search as SearchIcon, X } from "lucide-react";
import {
  Button as AriaButton,
  FieldError,
  Input as AriaInput,
  Label,
  SearchField,
  Text,
  type SearchFieldProps,
} from "react-aria-components";

export type SearchSize = "sm" | "md" | "lg";

export interface SearchProps
  extends Omit<SearchFieldProps, "className" | "children"> {
  label: string;
  description?: string;
  errorMessage?: string;
  placeholder?: string;
  size?: SearchSize;
  showLabel?: boolean;
  clearLabel?: string;
  className?: string;
}

export function Search({
  label,
  description,
  errorMessage,
  placeholder,
  size = "md",
  showLabel = false,
  clearLabel = "Limpiar búsqueda",
  isInvalid,
  className,
  ...props
}: SearchProps) {
  const classes = [
    "igx-search-field",
    `igx-search-field--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const labelClasses = [
    "igx-search-field__label",
    !showLabel && "igx-search-field__label--visually-hidden",
  ]
    .filter(Boolean)
    .join(" ");

  const invalid = isInvalid ?? errorMessage !== undefined;

  return (
    <SearchField {...props} isInvalid={invalid} className={classes}>
      <Label className={labelClasses}>{label}</Label>

      <div className="igx-search-field__control-wrap">
        <SearchIcon
          className="igx-search-field__search-icon"
          aria-hidden="true"
        />

        <AriaInput
          className="igx-search-field__control"
          {...(placeholder !== undefined ? { placeholder } : {})}
        />

        <AriaButton
          className="igx-search-field__clear"
          aria-label={clearLabel}
        >
          <X aria-hidden="true" />
        </AriaButton>
      </div>

      {description ? (
        <Text
          slot="description"
          className="igx-search-field__description"
        >
          {description}
        </Text>
      ) : null}

      {errorMessage ? (
        <FieldError className="igx-search-field__error">
          {errorMessage}
        </FieldError>
      ) : null}
    </SearchField>
  );
}
