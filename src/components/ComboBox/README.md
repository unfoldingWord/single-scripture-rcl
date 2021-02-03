```js
import { ComboBox } from "../.."

///////////////////////////////////////////

const style = { marginTop: '16px', width: '500px' }

function Component() {

  const config = {
    label: 'ComboBox',
    options: [
      { id: 1, title: 'Item 1'},
      { id: 2, title: 'Item 2'}
      ],
    current: 1,
    allowUserInput: true,
    onChange: (title, index) => {
      console.log(`onChange - new  selection: title: '${title}', index:${index}`);
    },
    style
  };


  return (
    <ComboBox {...config} />
  );
}

<Component />;
```
