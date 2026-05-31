export default function Desmos({id}: {id : string}) {
    const style = {
        border: "1px solid #ccc"
    };

    return (
        <iframe 
            src={`https://www.desmos.com/calculator/${id}?embed`}
            width="100%" height="100%"
            style={style}
        />
    );
}