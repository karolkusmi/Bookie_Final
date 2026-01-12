const Message = ({ text, sender }) => {
    return (
        <div className={`message ${sender}`}>
            {text}
        </div>
    );
};
export default Message;