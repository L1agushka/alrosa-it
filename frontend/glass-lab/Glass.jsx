import {useId, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {
  buildDisplacementMap,
  buildSpecularMap,
  buildInteriorMask,
  imageDataToUrl,
} from './vendor/maps';

import {supportsRefraction} from './capabilities';

const mapCache = new Map();
const channelMatrix = (channel) => [0, 1, 2, 3]
  .map(row => [0, 1, 2, 3, 4]
    .map(column => Number(row === column && (row === channel || row === 3)))
    .join(' '))
  .join(' ');

export function Glass({
  children,
  className = '',
  radius = 24,
  strength = 1,
  dispersion = 0.035,
  fallback = false,
  as: Tag = 'div',
  ...props
}) {
  const Content = Tag === 'button' ? 'span' : 'div';
  const ref = useRef(null);
  const id = 'lens-' + useId().replace(/[^a-z0-9]/gi, '');
  const [size, setSize] = useState(null);

  useLayoutEffect(() => {
    const element = ref.current;
    const measure = () => {
      const w = Math.round(element.offsetWidth);
      const h = Math.round(element.offsetHeight);
      setSize(previous => previous?.w === w && previous?.h === h ? previous : {w, h});
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const maps = useMemo(() => {
    if (!size?.w || !size.h) return null;
    const {w, h} = size;
    const key = [w, h, radius].join(':');
    if (mapCache.has(key)) return mapCache.get(key);
    const shape = {width: w, height: h, radius};
    const bezel = Math.min(24, h / 3, radius);
    const displacement = buildDisplacementMap(shape, {
      bezel,
      thickness: bezel * 2.3,
      ior: 1.5,
      profile: 'squircle',
    });
    const result = {
      map: imageDataToUrl(displacement),
      scale: displacement.scale,
      mask: imageDataToUrl(buildInteriorMask(shape, bezel)),
      specular: imageDataToUrl(buildSpecularMap(shape, {
        angle: -135,
        rimWidth: 1.2,
        glowWidth: 8,
      }, 1)),
    };
    // Reuse textures when only optical strength changes; bound retained memory.
    mapCache.set(key, result);
    if (mapCache.size > 32) mapCache.delete(mapCache.keys().next().value);
    return result;
  }, [size, radius]);

  const enhanced = supportsRefraction && !fallback && maps;
  const filter = enhanced ? `url(#${id}) saturate(1.15)` : 'blur(12px) saturate(1.15)';

  return (
    <Tag
      ref={ref}
      {...props}
      className={`glass ${!enhanced ? 'fallback' : ''} ${className}`}
      style={{borderRadius: radius, backdropFilter: filter, WebkitBackdropFilter: filter}}
    >
      <span className="tint" aria-hidden="true"
        style={maps ? {maskImage: `url(${maps.mask})`} : undefined} />
      <span className="shine" aria-hidden="true"
        style={maps ? {backgroundImage: `url(${maps.specular})`} : undefined} />
      <Content className="glass-content">{children}</Content>
      {enhanced && (
        <svg width="0" height="0" className="defs" aria-hidden="true">
          <filter id={id} x="0" y="0" width={size.w} height={size.h}
            filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feImage href={maps.map} width={size.w} height={size.h} result="map" />
            {dispersion === 0 ? (
              <feDisplacementMap in="SourceGraphic" in2="map" scale={maps.scale * strength}
                xChannelSelector="R" yChannelSelector="G" />
            ) : <>
              {[1 + dispersion, 1, 1 - dispersion].map((factor, channel) => (
                <Channel key={channel} channel={channel} scale={maps.scale * strength * factor} />
              ))}
              <feBlend in="c0" in2="c1" mode="screen" result="rg" />
              <feBlend in="rg" in2="c2" mode="screen" />
            </>}
          </filter>
        </svg>
      )}
    </Tag>
  );
}

function Channel({channel, scale}) {
  return <>
    <feDisplacementMap in="SourceGraphic" in2="map" scale={scale}
      xChannelSelector="R" yChannelSelector="G" result={`d${channel}`} />
    <feColorMatrix in={`d${channel}`} values={channelMatrix(channel)} result={`c${channel}`} />
  </>;
}
