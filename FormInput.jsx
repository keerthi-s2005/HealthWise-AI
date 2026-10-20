import React from "react";
import "./Components.css";

/**
 * Reusable and accessible form input component.
 */
function FormInput({
    label,
    name,
    type = "text",
    value,
    onChange,
    error,
    placeholder,
    required = false,
    min,
    max,
    checked
}) {
    const isCheckbox = type === "checkbox";
    const isRadio = type === "radio";

    if (isCheckbox || isRadio) {
        return (
            <div className={`form-group-checkbox ${error ? "has-error" : ""}`}>
                <label className="checkbox-label">
                    <input
                        type={type}
                        name={name}
                        checked={checked}
                        value={value}
                        onChange={onChange}
                        required={required}
                        className="checkbox-input"
                    />
                    <span className="checkbox-text">
                        {label} {required && <span className="required-star">*</span>}
                    </span>
                </label>
                {error && <span className="field-error" role="alert">{error}</span>}
            </div>
        );
    }

    return (
        <div className={`form-group ${error ? "has-error" : ""}`}>
            <label htmlFor={name} className="form-label">
                {label} {required && <span className="required-star">*</span>}
            </label>
            <input
                id={name}
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                min={min}
                max={max}
                className="form-input"
                aria-invalid={!!error}
                aria-describedby={error ? `${name}-error` : undefined}
            />
            {error && (
                <span id={`${name}-error`} className="field-error" role="alert">
                    {error}
                </span>
            )}
        </div>
    );
}

export default FormInput;
