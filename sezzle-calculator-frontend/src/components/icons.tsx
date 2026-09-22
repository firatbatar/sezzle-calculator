// Inline SVG icons adapted from Lucide (https://lucide.dev, ISC License)

const iconProps = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "size-6 sm:size-7",
    "aria-hidden": true,
    focusable: false,
} as const;

export function DeleteIcon() {
    return (
        <svg {...iconProps}>
            <path d="M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
            <path d="m12 9 6 6" />
            <path d="m18 9-6 6" />
        </svg>
    );
}

export function SquareRootIcon() {
    return (
        <svg {...iconProps}>
            <path d="M3 12h3.28a1 1 0 0 1 .948.684l2.298 7.934a.5.5 0 0 0 .96-.044L13.82 4.771A1 1 0 0 1 14.792 4H21" />
        </svg>
    );
}
