export const builtInPlans = [
    { id: "tom", label: "Tom", src: require("../../../assets/fields/tom.jpg") },
    { id: "fotball", label: "Fotboll", src: require("../../../assets/fields/fotball.jpg") },
    { id: "handboll", label: "Handboll", src: require("../../../assets/fields/handball.jpg") },
    { id: "hockey", label: "Hockey", src: require("../../../assets/fields/hockey.jpg") },
    { id: "basketball", label: "Basket", src: require("../../../assets/fields/basketball.jpg") },
];

export const getEndMs = (strokesArr) => {
    let max = 0;
    for (const s of strokesArr) {
        const type = s.type || "pen";

        if (type === "pen") {
            const last = s.points?.[s.points.length - 1];
            if (last?.t > max) max = last.t;
        } else {
            if ((s.t ?? 0) > max) max = s.t ?? 0;
        }
    }
    return max;
};

export const getArrowHead = (x1, y1, x2, y2, w) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    const ux = dx / len;
    const uy = dy / len;

    const headLen = Math.max(10, w * 4);
    const headWidth = Math.max(8, w * 3);

    const bx = x2 - ux * headLen;
    const by = y2 - uy * headLen;

    const nx = -uy;
    const ny = ux;

    const leftX = bx + nx * (headWidth / 2);
    const leftY = by + ny * (headWidth / 2);
    const rightX = bx - nx * (headWidth / 2);
    const rightY = by - ny * (headWidth / 2);

    return `${leftX},${leftY} ${x2},${y2} ${rightX},${rightY}`;
};
