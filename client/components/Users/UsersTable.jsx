import React, { Component } from 'react';
import _ from 'lodash';

import {
  Table,
  TableCell,
  TableRouteCell,
  TableBody,
  TableTextCell,
  TableHeader,
  TableColumn,
  TableRow
} from 'auth0-extension-ui';

import './UserTable.styles.css';
import { getProperty } from '../../utils';

export default class UsersTable extends Component {
  static propTypes = {
    users: React.PropTypes.array.isRequired,
    loading: React.PropTypes.bool.isRequired,
    userFields: React.PropTypes.array.isRequired,
    onColumnSort: React.PropTypes.func.isRequired,
    sortOrder: React.PropTypes.number.isRequired,
    sortProperty: React.PropTypes.string.isRequired,
  };

  getListFields(props) {
    const { userFields } = props;
    const defaultListFields = [
      {
        listOrder: 0,
        listSize: '20%',
        property: 'name',
        label: 'Name',
        display: (user, value) => (value || user.nickname || user.email || user.user_id),
        search: {
          sort: true
        }
      },
      {
        listOrder: 1,
        listSize: '29%',
        property: 'email',
        label: 'Email',
        display: (user, value) => value || 'N/A'
      },
      {
        listOrder: 2,
        listSize: '15%',
        property: 'last_login_relative',
        sortProperty: 'last_login',
        label: 'Latest Login',
        search: {
          sort: true
        }
      },
      {
        listOrder: 3,
        listSize: '15%',
        property: 'logins_count',
        label: 'Logins',
        search: {
          sort: true
        }
      }
    ];

    const connectionField = _.find(userFields, { property: 'connection' });
    if (connectionField && (_.isFunction(connectionField.display) || (_.isBoolean(connectionField.display) && connectionField.display === true))) {
      defaultListFields.push({
        listOrder: 4,
        listSize: '25%',
        property: 'identities',
        label: 'Connection',
        display: (user, value) => (_.isFunction(connectionField.display) ? connectionField.display(user, value) : value[0].connection)
      });
    }

    let listFields = defaultListFields;

    // Apply some customization
    if (userFields.length > 0) {
      // Figure out if we have any user list fields
      const customListFields = _(userFields)
        .filter(field => _.isObject(field.search) || (_.isBoolean(field.search) && field.search === true))
        .map((field) => {
          if (_.isBoolean(field.search) && field.search === true) {
            const defaultField = Object.assign({}, field, {
              listOrder: 1000,
              listSize: '25%'
            });
            return defaultField;
          }

          const customField = Object.assign({}, field, field.search);
          return customField;
        })
        .value();

      // If we do, allow the userFields to override the existing search fields
      if (Array.isArray(customListFields) && customListFields.length > 0) {
        // First filter out defaultListFields from userField entries
        const customFieldProperties = _(userFields)
          .filter(field => _.isObject(field.search) || (_.isBoolean(field.search) && field.search === true))
          .map('property')
          .value();

        listFields = _(defaultListFields)
          .filter(field => customFieldProperties.indexOf(field.property) < 0)
          .concat(customListFields)
          .sortBy(field => field.listOrder)
          .filter(field => field.display !== false) // Remove any fields that have display set to false
          .value();
      }

      /* Now filter out any fields that are set to search === false, this should kill custom fields that are
       * overriding default fields
       */
      const falseSearchFields = _(userFields)
        .filter(field => field.search === false)
        .map('property')
        .value();

      listFields = _(listFields)
        .filter(field => falseSearchFields.indexOf(field.property) < 0)
        .value();
    }

    return listFields;
  }

  constructor(props) {
    super(props);

    const listFields = this.getListFields(props);

    this.state = {
      listFields
    };
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(this.props.userFields, nextProps.userFields)) {
      const listFields = this.getListFields(nextProps);
      
      this.setState({
        listFields
      });
    }
  }

  getValue(field, user, defaultValue) {
    // First get the value
    let value;
    if (typeof field.property === 'function') value = field.property(user);
    else if (field.property) value = getProperty(user, field.property);

    // Now get the display value
    const displayProperty = field.search && field.search.display ? field.search.display : field.display;
    let display;
    let displayFunction;
    if (typeof displayProperty === 'function') displayFunction = displayProperty;
    if (displayFunction) {
      try {
        display = displayFunction(user, value);
      } catch(e) {
        display = 'error';
        console.error(`Error fetching value for ${user.user_id}'s ${field.label}: `, e.message);
      }
    }

    if (!display && typeof value === 'object') {
      display = JSON.stringify(value);
    }

    return display || value || defaultValue;
  }

  onColumnSort(property, sortOrder) {
    const sort = {
      property,
      order: sortOrder === -1 ? 1 : -1
    };
    this.props.onColumnSort(sort);
  }

  render() {
    const { users, sortProperty, sortOrder } = this.props;

    const listFields = this.state.listFields;

    return (
      <Table>
        <TableHeader>
          <TableColumn width="6%"/>
          {
            listFields.map((field) => {
              const sort = _.isObject(field.search)
                && (_.isBoolean(field.search.sort) && field.search.sort === true);

              if (sort) {
                return (
                  <TableColumn key={field.property} width={field.listSize}>
                    <div className="table-column-div"
                         onClick={this.onColumnSort.bind(this, field.sortProperty || field.property, sortOrder)}>
                      {field.label}
                      {((field.sortProperty || field.property) === sortProperty) &&
                      <i className={sortOrder === -1 ? 'icon-budicon-462 icon' : 'icon-budicon-460 icon'}
                         aria-hidden="true"/>}
                    </div>
                  </TableColumn>
                );
              }

              return (
                <TableColumn key={field.property} width={field.listSize}>
                  {field.label}
                </TableColumn>
              );
            })
          }
        </TableHeader>
        <TableBody>
          {users.map(user =>
            <TableRow key={user.user_id}>
              <TableCell>
                <img className="img-circle" src={user.picture} alt={name} width="32"/>
              </TableCell>
              {
                listFields.map((field, index) => {
                  const key = `${user.user_id}_${field.property}`;
                  if (index === 0) {
                    return (
                      <TableRouteCell key={key} route={`/users/${user.user_id}`}>
                        {this.getValue(field, user, '(empty)')}
                      </TableRouteCell>
                    );
                  }
                  return <TableTextCell key={key}>{this.getValue(field, user)}</TableTextCell>;
                })
              }
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  }
}
