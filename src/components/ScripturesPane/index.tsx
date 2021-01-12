import * as React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Row from '../Row';
import { Card } from "translation-helps-rcl";
import ScripturePane from '../ScripturePane';
import {Container} from "../ScripturePane/styled";

// const useChildrenStyles = makeStyles({
// // @ts-ignore
//   flexGrow: 1,
// // @ts-ignore
//   flexShrink: 1,
// // @ts-ignore
//   flexBasis: 0,
// });

function ScripturesPane(
  {
    reference,
    resources,
    config,
  }) {

  function getScriptures() {
    const scriptures = resources.map((resource, i) => (
      <div style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0 }}>
          <Card key={i}>
            <ScripturePane config={config} resource={resource}
                         reference={reference} resourceLink={null}
            />
          </Card>
      </div>
    ));
    return scriptures;
  }

  return (
    <Row>
      {getScriptures()}
    </Row>
  );
}

export default ScripturesPane;
