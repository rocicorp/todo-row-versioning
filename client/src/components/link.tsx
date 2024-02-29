import {JSX} from 'solid-js';

const Link = (props: {
  children: JSX.Element;
  selected: boolean;
  onClick: () => void;
}) => (
  <a
    classList={{selected: props.selected}}
    style={{cursor: 'pointer'}}
    onClick={() => props.onClick()}
  >
    {props.children}
  </a>
);

export default Link;
