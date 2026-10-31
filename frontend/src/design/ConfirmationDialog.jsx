import {useEffect, useRef} from 'react';

/** Native top layer keeps keyboard focus in the existing confirmation flow. */
export default function ConfirmationDialog({children, titleId, onCancel}) {
  const ref=useRef(null);
  useEffect(()=>{
    const element=ref.current;
    element.showModal();
    return()=>element.close();
  },[]);
  return <dialog ref={ref} className="policy-dialog" aria-labelledby={titleId}
    onCancel={event=>{event.preventDefault();onCancel()}}>{children}</dialog>;
}
