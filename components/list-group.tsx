import React, { ReactElement } from "react";
import { DimensionValue, View, ViewStyle } from "react-native";

interface ListGroupChildProps {
  style?: ViewStyle;
  [key: string]: any;
}

interface ListGroupProps {
  children: ReactElement<ListGroupChildProps>[];
  gap?: number;
  style?: ViewStyle;
  itemBorderRadius?: number;
  itemHeight?: DimensionValue;
}

function ListGroup(props: ListGroupProps) {
  const {
    children,
    gap = 1,
    style,
    itemBorderRadius = 8,
    itemHeight = 55,
  } = props;
  const itemsCount = React.Children.count(children);

  return (
    <View style={[{ gap }, style]}>
      {React.Children.map(children, (child, index) => {
        const childStyle = child.props.style || {};

        const newStyle: ViewStyle = {
          paddingHorizontal: 16,
          backgroundColor: "white",
          flexDirection: "row",
          alignItems: "center",
          borderTopLeftRadius: index === 0 ? itemBorderRadius : 0,
          borderTopRightRadius: index === 0 ? itemBorderRadius : 0,
          borderBottomLeftRadius:
            index === itemsCount - 1 ? itemBorderRadius : 0,
          borderBottomRightRadius:
            index === itemsCount - 1 ? itemBorderRadius : 0,
          height: itemHeight,
          ...childStyle,
        };

        return React.cloneElement(child, {
          style: newStyle,
          key: child.key,
        });
      })}
    </View>
  );
}

export { ListGroup };
