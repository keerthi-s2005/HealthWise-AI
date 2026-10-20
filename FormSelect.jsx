import React from "react";
import "./Components.css";

/**
 * Reusable and accessible form select dropdown component.
 */
function FormSelect({
    label,
    name,
    value,
    onChange,
    options = [],
    error,
    required = false
}) {
    return (
        <div className={`form-group ${error ? "has-error" : ""}`}>
            <label htmlFor={name} className="form-label">
                {label} {required && <span className="required-star">*</span>}
            </label>
            <select
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                className="form-select"
                aria-invalid={!!error}
                aria-describedby={error ? `${name}-error` : undefined}
            >
                <option value="">Select an option</option>
                {options.map((opt, index) => {
                    const isObj = typeof opt === "object" && opt !== null;
                    const val = isObj ? opt.value : opt;
                    const displayLabel = isObj ? opt.label : opt;
                    return (
                        <option key={index} value={val}>
                            {displayLabel}
                        </option>
                    );
                })}
            </select>
            {error && (
                <span id={`${name}-error`} className="field-error" role="alert">
                    {error}
                </span>
            )}
        </div>
    );
}

export default FormSelect;
