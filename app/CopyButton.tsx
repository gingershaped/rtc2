import { useState } from "react";

type CopyButtonProps = {
    className?: string,
    title: string,
    generate: () => string,
};

export function CopyButton({ className, title, generate }: CopyButtonProps) {
    const TITLES = {
        copy: title,
        copied: "Copied!",
        failed: "Failed to copy",
    };
    const ICONS = {
        copy: "bi-clipboard",
        copied: "bi-clipboard-check",
        failed: "bi-clipboard-x",
    };
    const VARIANTS = {
        copy: "primary",
        copied: "success",
        failed: "danger",
    };
    const [state, setState] = useState<"copy" | "copied" | "failed">("copy");

    return (
        <button
            className={(className ?? "") + ` btn btn-${VARIANTS[state]}`}
            title={TITLES[state]}
            onClick={async() => {
                if (state == "copy") {
                    try {
                        // @ts-expect-error Apparently "clipboard-write" isn't a permission TS knows
                        const permission = await navigator.permissions.query({ name: "clipboard-write" });
                        if (permission.state != "granted") {
                            console.error("Clipboard write permission not granted, is this a secure context?");
                            setState("failed");
                            return;
                        }
                    } catch {
                        // we're probably on firefox
                    }
                    try {
                        await navigator.clipboard.writeText(generate());
                        setState("copied");
                    } catch (e) {
                        setState("failed");
                        console.error("Failed to copy", e);
                    } finally {
                        setTimeout(() => setState("copy"), 1500);
                    }
                }
            }}
        >
            <i className={`bi ${ICONS[state]}`}></i>
        </button>
    );
}