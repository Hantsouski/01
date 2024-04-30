import { fromDOMEvent, metaStream, stream } from "@thi.ng/rstream";

export const onlyClicks = (el: HTMLElement) => {
    const mousedown$ = fromDOMEvent(el, "mousedown");
    const meta$ = metaStream((mouseDown: MouseEvent) => {
      const trueMouseDown$ = stream<MouseEvent>();
  
      fromDOMEvent(el, "mouseup", { once: true }).subscribe({
        next: (ev) => {
          if (ev.timeStamp - mouseDown.timeStamp < 200) {
            trueMouseDown$.next(mouseDown);
          }
        },
      });
  
      return trueMouseDown$;
    });
  
    mousedown$.subscribe(meta$);
  
    return meta$;
  };