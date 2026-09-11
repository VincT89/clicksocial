import * as React from "react";
import usePrivateImage from '@/hooks/usePrivateImage';
const FALLBACK = "/assets/12d367_4f26ccd17f8f4e3a8958306ea08c2332~mv2.png";
const Image = React.forwardRef(/** @param {React.ImgHTMLAttributes<HTMLImageElement> & {fittingType?:string,originWidth?:number,originHeight?:number,focalPointX?:number,focalPointY?:number,quality?:number}} props */ ({src, fittingType, originWidth, originHeight, focalPointX, focalPointY, quality, onError, ...props}, ref) => {
  const [failedSource, setFailedSource] = React.useState(null);
  const resolved = usePrivateImage(src);
  const failed = !!src && failedSource === src;
  return <img ref={ref} src={!src || failed || resolved.error ? FALLBACK : resolved.url || undefined} {...props} data-error-image={failed || !!resolved.error || undefined} onError={event => { if (!failed) { setFailedSource(src); onError?.(event); } }} />;
});
Image.displayName = "Image";
export { Image };
