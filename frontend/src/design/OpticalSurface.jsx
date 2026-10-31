import {useId, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {buildDisplacementMap, buildInteriorMask, buildSpecularMap, imageDataToUrl} from '../../glass-lab/vendor/maps';

const cache = new Map();
const supported = typeof navigator !== 'undefined' && /Chrome\//.test(navigator.userAgent) && !/CriOS|EdgiOS/.test(navigator.userAgent);

/** The lab's physical rim, limited to compact premium surfaces. Data stays clear. */
export default function OpticalSurface({as:Tag='div', level='standard', radius=12, className='', children, style, ...props}) {
  const Content=Tag==='button'?'span':'div';
  const root=useRef(null);
  const id='ava-lens-'+useId().replace(/[^a-z0-9]/gi,'');
  const [size,setSize]=useState(null);
  useLayoutEffect(()=>{
    if(level!=='premium'||!supported)return;
    const el=root.current;
    const observer=new ResizeObserver(()=>{
      const w=Math.round(el.offsetWidth),h=Math.round(el.offsetHeight);
      setSize(old=>old?.w===w&&old?.h===h?old:{w,h});
    });
    observer.observe(el);
    return()=>observer.disconnect();
  },[level]);
  const maps=useMemo(()=>{
    // Avoid large GPU filter allocations, particularly expanded mobile navigation.
    if(level!=='premium'||!size?.w||!size.h||size.w*size.h>180000)return null;
    const key=`${size.w}:${size.h}:${radius}`;
    if(cache.has(key))return cache.get(key);
    const shape={width:size.w,height:size.h,radius};
    const bezel=Math.min(18,radius,size.h/3);
    const displacement=buildDisplacementMap(shape,{bezel,thickness:bezel*1.7,ior:1.5,profile:'squircle'});
    const result={map:imageDataToUrl(displacement),scale:displacement.scale*.8,
      mask:imageDataToUrl(buildInteriorMask(shape,bezel)),
      spec:imageDataToUrl(buildSpecularMap(shape,{angle:-135,rimWidth:1.1,glowWidth:5},1))};
    cache.set(key,result);if(cache.size>16)cache.delete(cache.keys().next().value);
    return result;
  },[size,radius,level]);
  const enhanced=level==='premium'&&supported&&maps;
  return <Tag ref={root} {...props} className={`optical optical-${level} ${enhanced?'optical-refractive':''} ${className}`}
    style={{...style,borderRadius:radius,...(enhanced?{backdropFilter:`url(#${id})`,WebkitBackdropFilter:`url(#${id})`}:{})}}>
    <span className="optical-tint" aria-hidden="true" style={enhanced?{maskImage:`url(${maps.mask})`}:undefined}/>
    {enhanced&&<span className="optical-shine" aria-hidden="true" style={{backgroundImage:`url(${maps.spec})`}}/>}
    <Content className="optical-content">{children}</Content>
    {enhanced&&<svg width="0" height="0" className="optical-defs" aria-hidden="true"><filter id={id} x="0" y="0" width={size.w} height={size.h} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB"><feImage href={maps.map} width={size.w} height={size.h} result="map"/><feDisplacementMap in="SourceGraphic" in2="map" scale={maps.scale} xChannelSelector="R" yChannelSelector="G"/></filter></svg>}
  </Tag>;
}
