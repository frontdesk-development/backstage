/*
 * Copyright 2021 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React from 'react';
import { MenuItem, Select } from '@material-ui/core';
import { Maybe, Label } from '../../types';
import { useSelectStyles as useStyles } from '../../utils/styles';

type LabelProductSelectProps = {
  label: Maybe<string>;
  labels: Array<Label>;
  onSelect: (label: Maybe<string>) => void;
};

export const LabelProductSelect = ({
  label,
  labels,
  onSelect,
}: LabelProductSelectProps) => {
  const classes = useStyles();

  const labelOptions = labels
    .filter(p => p.id)
    .sort((a, b) => (a.id as string).localeCompare(b.id as string));

  const handleOnChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    onSelect(e.target.value as string);
  };

  const renderValue = (value: unknown) => {
    const tier = value as string;
    return (
      <b data-testid={`selected-${tier}`}>
        {tier === 'all' ? 'All products' : tier}
      </b>
    );
  };

  return (
    <Select
      className={classes.select}
      variant="outlined"
      value={label || 'all'}
      renderValue={renderValue}
      onChange={handleOnChange}
      data-testid="label-filter-select"
    >
      {[{ id: 'all' }, ...labelOptions].map(lab => (
        <MenuItem
          className={`${classes.menuItem} compact`}
          key={lab.id}
          value={lab.id}
          data-testid={`option-${lab.id}`}
        >
          {lab.id === 'all' ? 'All products' : lab.id}
        </MenuItem>
      ))}
    </Select>
  );
};
