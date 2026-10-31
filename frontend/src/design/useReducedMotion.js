import {useSyncExternalStore} from 'react';
const query='(prefers-reduced-motion: reduce)';
const subscribe=notify=>{
  const media=window.matchMedia(query);
  media.addEventListener('change',notify);
  return()=>media.removeEventListener('change',notify);
};
export default function useReducedMotion(){
  return useSyncExternalStore(subscribe,()=>window.matchMedia(query).matches,()=>true);
}
