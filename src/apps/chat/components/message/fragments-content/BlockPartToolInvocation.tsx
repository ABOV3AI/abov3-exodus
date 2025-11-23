import * as React from 'react';

import type { ColorPaletteProp, SxProps, VariantProp } from '@mui/joy/styles/types';
import { Box, IconButton, Sheet } from '@mui/joy';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

import { BlocksContainer } from '~/modules/blocks/BlocksContainers';
import { useScaledTypographySx } from '~/modules/blocks/blocks.styles';

import type { ContentScaling } from '~/common/app.theme';
import type { DMessageToolInvocationPart } from '~/common/stores/chat/chat.fragments';


const keyValueGridSx = {
  border: '1px solid',
  borderRadius: 'sm',
  boxShadow: 'inset 2px 0 4px -2px rgba(0, 0, 0, 0.2)',
  p: 1.5,

  // Grid layout with 2 columns
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  // alignItems: 'baseline',
  columnGap: 2,
  rowGap: 0.5,

  // fade the text of the first column
  // '& > :nth-of-type(odd)': {
  //   opacity: 0.67,
  //   // fontSize: '90%',
  // },
} as const;


export type KeyValueData = { label: string, value: React.ReactNode, asCode?: boolean }[];

export function KeyValueGrid(props: {
  data: KeyValueData,
  contentScaling: ContentScaling,
  color?: ColorPaletteProp,
  variant?: VariantProp,
  stableSx?: SxProps,
}) {

  const { fontSize, lineHeight } = useScaledTypographySx(props.contentScaling, false, false);

  const gridSx = React.useMemo(() => ({
    ...keyValueGridSx,
    // fontWeight,
    fontSize,
    lineHeight,
    ...props.stableSx,
  }), [fontSize, lineHeight, props.stableSx]);

  return (
    <Sheet color={props.color} variant={props.variant || 'soft'} sx={gridSx}>
      {props.data.map(({ label, value }, index) => (
        <React.Fragment key={index}>
          <div>{label}</div>
          <div>{value}</div>
        </React.Fragment>
      ))}
    </Sheet>
  );
}


function CollapsibleContent(props: { content: string; maxLines?: number }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const maxLines = props.maxLines || 3;

  const lines = props.content.split('\n');
  const shouldCollapse = lines.length > maxLines;
  const displayContent = shouldCollapse && !isExpanded
    ? lines.slice(0, maxLines).join('\n') + '\n...'
    : props.content;

  if (!shouldCollapse) {
    return <div style={{ whiteSpace: 'pre-wrap' }}>{props.content}</div>;
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <div style={{ whiteSpace: 'pre-wrap' }}>{displayContent}</div>
      <IconButton
        size="sm"
        variant="plain"
        onClick={() => setIsExpanded(!isExpanded)}
        sx={{ mt: 0.5 }}
      >
        {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        {isExpanded ? 'Show less' : `Show ${lines.length - maxLines} more lines`}
      </IconButton>
    </Box>
  );
}

export function BlockPartToolInvocation(props: {
  toolInvocationPart: DMessageToolInvocationPart,
  contentScaling: ContentScaling,
  onDoubleClick?: (event: React.MouseEvent) => void;
}) {

  const part = props.toolInvocationPart;

  const kvData: KeyValueData = React.useMemo(() => {
    switch (part.invocation.type) {
      case 'function_call':
        const argsStr = part.invocation.args || 'None';
        return [
          { label: 'Name', value: <strong>{part.invocation.name}</strong> },
          { label: 'Args', value: <CollapsibleContent content={argsStr} maxLines={3} />, asCode: false },
          { label: 'Id', value: part.id },
        ];
      case 'code_execution':
        return [
          { label: 'Language', value: part.invocation.language },
          { label: 'Author', value: part.invocation.author },
          {
            label: 'Code',
            value: <CollapsibleContent content={part.invocation.code.trim()} maxLines={5} />,
          },
          { label: 'Id', value: part.id },
        ];
    }
  }, [part]);

  return (
    <BlocksContainer onDoubleClick={props.onDoubleClick}>
      <KeyValueGrid
        data={kvData}
        contentScaling={props.contentScaling}
      />
    </BlocksContainer>
  );
}
