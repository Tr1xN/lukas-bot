import NodeGeocoder from 'node-geocoder';
const geocoder = NodeGeocoder({provider: 'openstreetmap'});

export async function reverseLocation(lat, lon){
    const loc = await geocoder.reverse({ lat: 49.002013, lon: 33.641194 })
    return(loc[0].formattedAddress)
}

