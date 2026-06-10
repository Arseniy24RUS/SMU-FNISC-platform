'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent, WheelEvent } from 'react';
import { publicAssetPath } from '@/lib/deploy';

type Transform = {
  scale: number;
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 620;
const MIN_SCALE = 1;
const MAX_SCALE = 4.5;
const ZOOM_STEP = 1.22;

const DEFAULT_BOUNDS = {
  x: 70,
  y: 78,
  width: 650,
  height: 390
};

const INITIAL_TRANSFORM: Transform = {
  scale: 1,
  x: 0,
  y: 0
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampTransform(transform: Transform, viewportWidth: number, viewportHeight: number): Transform {
  const scale = clamp(transform.scale, MIN_SCALE, MAX_SCALE);
  const scaledWidth = viewportWidth * scale;
  const scaledHeight = viewportHeight * scale;
  const minX = Math.min(0, viewportWidth - scaledWidth);
  const minY = Math.min(0, viewportHeight - scaledHeight);

  return {
    scale,
    x: clamp(transform.x, minX, 0),
    y: clamp(transform.y, minY, 0)
  };
}

function getViewport(element: HTMLElement) {
  const width = element.clientWidth || MAP_WIDTH;
  const height = element.clientHeight || Math.round(width * MAP_HEIGHT / MAP_WIDTH);
  return { width, height };
}

function fitDefaultView(element: HTMLElement): Transform {
  const { width, height } = getViewport(element);
  const baseScale = width / MAP_WIDTH;
  const scale = clamp(
    Math.min(
      width / (DEFAULT_BOUNDS.width * baseScale),
      height / (DEFAULT_BOUNDS.height * baseScale)
    ),
    MIN_SCALE,
    MAX_SCALE
  );

  const x = (width - DEFAULT_BOUNDS.width * baseScale * scale) / 2 - DEFAULT_BOUNDS.x * baseScale * scale;
  const y = (height - DEFAULT_BOUNDS.height * baseScale * scale) / 2 - DEFAULT_BOUNDS.y * baseScale * scale;

  return clampTransform({ scale, x, y }, width, height);
}

export function PresenceMapViewer() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [transform, setTransform] = useState<Transform>(INITIAL_TRANSFORM);
  const [isDragging, setIsDragging] = useState(false);

  const resetView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setTransform(fitDefaultView(viewport));
  }, []);

  useEffect(() => {
    resetView();
    const viewport = viewportRef.current;
    if (!viewport) return;

    const resizeObserver = new ResizeObserver(() => {
      setTransform(fitDefaultView(viewport));
    });
    resizeObserver.observe(viewport);

    return () => resizeObserver.disconnect();
  }, [resetView]);

  const zoomAt = useCallback((nextScale: number, centerX?: number, centerY?: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const { width, height } = getViewport(viewport);
    const pivotX = centerX ?? width / 2;
    const pivotY = centerY ?? height / 2;

    setTransform((current) => {
      const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
      const ratio = scale / current.scale;
      return clampTransform(
        {
          scale,
          x: pivotX - (pivotX - current.x) * ratio,
          y: pivotY - (pivotY - current.y) * ratio
        },
        width,
        height
      );
    });
  }, []);

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const direction = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    zoomAt(transform.scale * direction, event.clientX - rect.left, event.clientY - rect.top);
  }, [transform.scale, zoomAt]);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y
    };
    setIsDragging(true);
  }, [transform.x, transform.y]);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag || !viewport || drag.pointerId !== event.pointerId) return;

    const { width, height } = getViewport(viewport);
    setTransform((current) => clampTransform(
      {
        ...current,
        x: drag.originX + event.clientX - drag.startX,
        y: drag.originY + event.clientY - drag.startY
      },
      width,
      height
    ));
  }, []);

  const stopDragging = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
    }
  }, []);

  return (
    <figure className="presence-map-card interactive-presence-map-card">
      <div className="interactive-presence-map-toolbar" aria-label="Управление картой">
        <button type="button" onClick={() => zoomAt(transform.scale * ZOOM_STEP)} aria-label="Приблизить карту">+</button>
        <button type="button" onClick={() => zoomAt(transform.scale / ZOOM_STEP)} aria-label="Отдалить карту">−</button>
        <button type="button" onClick={resetView}>Сброс</button>
        <span>{Math.round(transform.scale * 100)}%</span>
      </div>
      <div
        ref={viewportRef}
        className={`interactive-presence-map-viewport${isDragging ? ' is-dragging' : ''}`}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        role="application"
        aria-label="Интерактивная карта присутствия ФНИСЦ РАН. Используйте колесо мыши или кнопки, чтобы менять масштаб; перетаскивайте карту для перемещения."
      >
        <Image
          className="interactive-presence-map-image"
          src={publicAssetPath('/maps/fnisc-presence-map.svg')}
          alt="Карта субъектов Российской Федерации с отмеченными городами присутствия ФНИСЦ РАН"
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          sizes="(max-width: 900px) 100vw, 68vw"
          draggable={false}
          unoptimized
          style={{ transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})` }}
        />
      </div>
      <figcaption>
        По умолчанию карта открывается на европейской части России так, чтобы были видны все узлы присутствия.
        Масштаб можно менять кнопками или колесом мыши, карту можно перемещать перетаскиванием.
      </figcaption>
      <style>{`
        .interactive-presence-map-card {
          position: relative;
        }
        .interactive-presence-map-viewport {
          position: relative;
          aspect-ratio: ${MAP_WIDTH} / ${MAP_HEIGHT};
          overflow: hidden;
          background: #f7f9fc;
          cursor: grab;
          touch-action: none;
        }
        .interactive-presence-map-viewport.is-dragging {
          cursor: grabbing;
        }
        .interactive-presence-map-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          transform-origin: 0 0;
          user-select: none;
          pointer-events: none;
          will-change: transform;
        }
        .interactive-presence-map-toolbar {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px;
          border: 1px solid rgba(24, 43, 98, .14);
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, .92);
          box-shadow: var(--shadow-soft);
          backdrop-filter: blur(10px);
        }
        .interactive-presence-map-toolbar button,
        .interactive-presence-map-toolbar span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 34px;
          height: 34px;
          border-radius: var(--radius-sm);
          font: inherit;
          font-size: 13px;
          font-weight: 800;
        }
        .interactive-presence-map-toolbar button {
          border: 1px solid var(--line);
          background: white;
          color: var(--brand-navy);
          cursor: pointer;
        }
        .interactive-presence-map-toolbar button:hover {
          color: white;
          border-color: var(--brand-navy);
          background: var(--brand-navy);
        }
        .interactive-presence-map-toolbar span {
          min-width: 48px;
          color: var(--muted);
        }
        @media (max-width: 640px) {
          .interactive-presence-map-toolbar {
            left: 12px;
            right: 12px;
            justify-content: flex-end;
          }
        }
      `}</style>
    </figure>
  );
}
