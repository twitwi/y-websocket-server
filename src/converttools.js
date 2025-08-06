
import { AbstractType, ContentFormat, ContentString, Map as YMap, Text, Array as YArray } from "yjs"

// unreliable, see https://github.com/yjs/yjs-inspector/blob/52e2b53e5a451ca1cb5a816e0fb5c4d700238701/src/y-shape.ts#L11C8-L42C2
export function guessYjsType(abstractType) {
  if (abstractType.constructor === YArray) {
    return YArray;
  }
  if (abstractType.constructor === YMap) {
    return YMap;
  }
  if (abstractType._map.size) {
    return YMap;
  }
  if (abstractType._length > 0) {
    const firstItem = abstractType._first;
    if (!firstItem) {
      console.error(
        "The length is greater than 0 but _first is not set",
        abstractType,
      );
      return AbstractType;
    }

    // Try distinguish between Text and YArray
    // Only check the first element, it's unreliable!
    if (
      firstItem.content instanceof ContentString ||
      firstItem.content instanceof ContentFormat
    ) {
      return Text;
    }
    return YArray;
  }
  return AbstractType;
}

export function getTypedYjsValue(doc, key) {
  const type = guessYjsType(doc.get(key))
  //console.log("Type:", type)
  return doc.get(key, type)
}




///////////////////
// from: https://github.com/joebobmiles/yjson/blob/master/src/index.js

export const createYMapFromObject = (object, ymap) =>
{
  //const ymap = new Y.Map();
  ymap ??= new YMap();

  for (let property in object)
  {
    if (object[property] instanceof Array)
      ymap.set(property, createYArrayFromArray(object[property]));

    else if (object[property] instanceof Object)
      ymap.set(property, createYMapFromObject(object[property]));

    else if (typeof object[property] === 'string') // added
      ymap.set(property, new Text(object[property]))

    else
      ymap.set(property, object[property]);
  }

  return ymap;
};

export const createYArrayFromArray = (array, yarray) =>
{
  //const yarray = new YArray();
  yarray ??= new YArray();

  for (let index in array)
  {
    if (array[index] instanceof Array)
      yarray.push([ createYArrayFromArray(array[index]) ]);

    else if (array[index] instanceof Object)
      yarray.push([ createYMapFromObject(array[index]) ]);

    else if (typeof array[index] === 'string') // added
      yarray.push([ new Text(array[index]) ])

else
      yarray.push([ array[index] ]);
  }

  return yarray;
};
