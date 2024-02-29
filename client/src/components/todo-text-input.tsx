import {createSignal} from 'solid-js';

const TodoTextInput = (props: {
  initial: string;
  placeholder?: string;
  onBlur?: (text: string) => void;
  onSubmit: (text: string) => void;
}) => {
  const [textInput, setTextInput] = createSignal(props.initial);

  const handleSubmit = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      props.onSubmit(textInput());
      setTextInput(() => '');
    }
  };

  const handleChange = (e: InputEvent) => {
    setTextInput((e.target as HTMLInputElement).value);
  };

  const handleBlur = () => {
    if (props.onBlur) {
      props.onBlur(textInput());
    }
  };

  return (
    <input
      classList={{
        'edit': props.initial !== '',
        'new-todo': props.initial === '',
      }}
      type="text"
      placeholder={props.placeholder}
      autofocus={true}
      value={textInput()}
      onBlur={handleBlur}
      onInput={handleChange}
      onKeyDown={handleSubmit}
    />
  );
};

export default TodoTextInput;
