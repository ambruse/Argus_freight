const replaceTableWithUnion = (sql, tableName, unionSql, defaultAlias) => {
  const keywords = 'WHERE|ORDER|GROUP|LIMIT|JOIN|SET|USING|ON|UNION|SELECT|HAVING|LEFT|RIGHT|INNER|OUTER|CROSS|STRAIGHT_JOIN|NATURAL';
  const regex = new RegExp(`\\b${tableName}\\s+(?:AS\\s+)?(?!(${keywords})\\b)([a-zA-Z0-9_]+)`, 'gi');
  let replaced = false;
  let result = sql.replace(regex, (match, g1, g2) => {
    replaced = true;
    return `${unionSql} ${g2}`;
  });
  if (!replaced) {
    const tableRegex = new RegExp(`\\b${tableName}\\b`, 'gi');
    result = result.replace(tableRegex, `${unionSql} ${defaultAlias}`);
  }
  return result;
};

const union = '(SELECT 1)';

console.log('Case 1 (with alias s):', replaceTableWithUnion('SELECT * FROM shipments s WHERE status = 1', 'shipments', union, '_u_s'));
console.log('Case 2 (without alias):', replaceTableWithUnion('SELECT * FROM shipments WHERE status = 1', 'shipments', union, '_u_s'));
console.log('Case 3 (shipment_replies r):', replaceTableWithUnion('SELECT COUNT(*) FROM shipment_replies r WHERE r.id = 1', 'shipment_replies', union, '_u_r'));
console.log('Case 4 (shipment_replies no alias):', replaceTableWithUnion('SELECT COUNT(*) FROM shipment_replies WHERE id = 1', 'shipment_replies', union, '_u_r'));
