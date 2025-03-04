function Button({buttonCSS, innerButtonText, onClick}){
    return (
        <button className={buttonCSS} onClick={onClick}>
            {innerButtonText}
        </button>
    )
}

export default Button