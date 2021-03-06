import express from 'express'
import rp from 'request-promise'
import queryString from 'query-string'
require('dotenv').config()

const router = express.Router();

router.post('/createIssue', function (req, res, next) {
  //console.log(req.body)
  const options = {
    method: 'POST',
    auth: {
      'user': process.env.JIRAUSER,
      'pass': process.env.JIRAPASS
    },
    uri: process.env.JIRAURL + '/rest/api/2/issue/',
    json: true,
    body: {
      "fields": req.body.createIssue
    }
  }
  //console.log(req.body.createIssue)

  rp(options)
    .then(function ($) {
      res.status(200).json($)
    })
    .catch(function (err) {
      console.log(err)
      res.status(500).send(err)
    })
});

const getFieldsIdbyNames = (async (createIssueByName) => {
  const options = {
    uri: process.env.LOCALHOST + '/get/jira/issue/issueFields?projectIdOrKey=AM&issueTypeId=10502',
    json: true,
  }

  return new Promise(async (resolve, reject) => {
    let newJson = {}

    rp(options)
      .then(function ($) {
        Object.keys(createIssueByName).forEach(async (key) => {
          //console.log(key)
          if (key != "project" && key != "issuetype") {
            let retKey = $.filter((sub) => { return sub.name === key })[0].fieldId
            //console.log(retKey)
            newJson[retKey] = createIssueByName[key]
          } else {
            newJson[key] = createIssueByName[key]
          }
          //console.log(newJson)
          if (Object.keys(newJson).length == Object.keys(createIssueByName).length) {
            resolve(newJson)
          }
        })
      })
  })
})

router.post('/createIssueByName', (async (req, res, next) => {
  let newJson = {}
  //console.log(req.body.createIssueByName)

  newJson = await getFieldsIdbyNames(req.body.createIssueByName)

  //console.log(newJson)
  const options = {
    method: 'POST',
    auth: {
      'user': process.env.JIRAUSER,
      'pass': process.env.JIRAPASS
    },
    uri: process.env.JIRAURL + '/rest/api/2/issue/',
    json: true,
    body: {
      "fields": newJson
    }
  }

  rp(options)
    .then(function ($) {
      res.status(200).json($)
    })
    .catch(function (err) {
      console.log(err)
      res.status(500).send(err)
    })
}))

router.post('/updateIssue', function (req, res, next) {
  //console.log(req.body)
  const options = {
    method: 'PUT',
    auth: {
      'user': process.env.JIRAUSER,
      'pass': process.env.JIRAPASS
    },
    uri: process.env.JIRAURL + '/rest/api/2/issue/' + req.body.updateIssue.issueId,
    json: true,
    body: {
      "update": req.body.updateIssue.body,
      fields: req.body.updateIssue.fields
    }
  }
  //console.log(req.body.updateIssue)

  rp(options)
    .then(function ($) {
      res.status(200).json($)
    })
    .catch(function (err) {
      console.log(err)
      res.status(500).send(err)
    })
});


router.get('/setJiraCreator', async (req, res, next) => {
  let options = {
    uri: process.env.LOCALHOST + '/get/jira/issue/issue?issueId=' + req.query.issueId,
    json: true
  }

  const CMDBValue = await rp(options)
    .then(async ($) => {
      if ($[req.query.from0] && !Object.keys($[req.query.from0]).includes(req.query.from1)) {
        const options2 = {
          method: 'POST',
          uri: process.env.LOCALHOST + '/get/jira/issue/CustomFieldID',
          body: { name: req.query.from1 },//'Creator User Info' },
          json: true
        }

        const fromCustomFieldID = await rp(options2)
          .then((ret2) => {
            return ret2
          })
        return $[req.query.from0][fromCustomFieldID]
      }
      else
        return $.fields[req.query.from0][req.query.from1]
    })

  console.log(CMDBValue)

  let query = {
    objectSchemaName: req.query.CMDBSchemaName,//'CivilWork',
    objectTypeName: req.query.CMDBObjectTypeName,//'AD_USERS',
    attribute: req.query.CMDBObjectAttributeName,//'Email',
    value: CMDBValue
  }

  options = {
    uri: process.env.LOCALHOST + '/get/jira/object/includeAttributObject?' + queryString.stringify(query),
    json: true
  }

  const objectKey = await rp(options)
    .then(($) => {
      console.log($)
      return $[0].Key
    })

  options = {
    method: 'POST',
    uri: process.env.LOCALHOST + '/get/jira/issue/CustomFieldID',
    body: { name: req.query.fieldName },//'Creator User Info' },
    json: true
  }

  const customFieldID = await rp(options)
    .then(($) => {
      return $
    })

  options = {
    method: 'POST',
    uri: process.env.LOCALHOST + '/set/jira/issue/updateIssue',
    body: {
      "updateIssue": {
        "issueId": req.query.issueId,
        "fields": {
          [customFieldID]: [{ "key": objectKey }]
        }
      }
    },
    json: true
  }
  res.send(objectKey)
  rp(options).then(($) => {
    return $
  })
})

router.post('/CloneInsightToField', async (req, res, next) => {
  console.log('CloneInsightToField')
  let options = {
    uri: process.env.LOCALHOST + '/get/jira/issue/issueNames?issueId=' + req.body.updateIssue.issueId,
    json: true
  }

  const issue = await rp(options)

  const fieldNameInsightId = issue.fields[req.body.updateIssue.fieldName][0].match(/\(([-A-Z0-9]*)\)$/)[1]
  console.log(fieldNameInsightId)

  options = {
    uri: process.env.LOCALHOST + '/get/jira/object/keyAttributeValue?Key=' + fieldNameInsightId + '&returnAttribute=' + req.body.updateIssue.attributeName,
    json: true
  }
  let replaceFieldValue = await rp(options)
  console.log('replacing: ')
  console.log(replaceFieldValue)

  options = {
    method: 'POST',
    uri: process.env.LOCALHOST + '/get/jira/issue/CustomFieldID',
    body: { name: req.body.updateIssue.replaceFieldName },//'Creator User Info' },
    json: true
  }

  let customFieldID = await rp(options)
    .then(($) => {
      return $
    })

  options = {
    method: 'POST',
    uri: process.env.LOCALHOST + '/set/jira/issue/updateIssue',
    body: {
      "updateIssue": {
        "issueId": req.body.updateIssue.issueId,
        "fields": {
          [customFieldID]: replaceFieldValue
        }
      }
    },
    json: true
  }

  res.json(await rp(options))
})


router.get('/addParticipant', function (req, res, next) {
  //console.log(req.body)
  const issueId = req.query.issueId
  const name = req.query.name
  const options = {
    method: 'POST',
    auth: {
      'user': process.env.JIRAUSER,
      'pass': process.env.JIRAPASS
    },
    uri: process.env.JIRAURL + '/rest/api/latest/issue/' + issueId + '/watchers',
    json: true,
    body: name
  }
  //console.log(req.body.updateIssue)

  rp(options)
    .then(function ($) {
      res.status(200).json($)
    })
    .catch(function (err) {
      console.log(err)
      res.status(500).send(err)
    })
});

module.exports = router;