var React = require('react/addons');
var request = require('browser-request');
var debounce = require('debounce');
var cx = require('classnames');

var parse = require('pegjs/lib/parser').parse;
var diagram = require('../lib/diagram');

var examples = require('./examples.json');
var exampleGrammar = examples[0].source;
examples = examples.slice(1);

var App = React.createClass({
  mixins: [
    React.addons.LinkedStateMixin
  ],

  componentWillMount() {
    this.updateGrammarDebounced = debounce(this.updateGrammar, 150).bind(this);
    if (location.hash) {
      this.loadGrammar(location.hash.replace(/^#/, ''));
    } else {
      this.updateGrammar(exampleGrammar);
    }
  },

  getInitialState() {
    return {
      examples: examples,
      rules: []
    };
  },
  
  render() {
    var e = this.state.syntaxError;
    return (
      <div>
        <div className="col-md-6">
          <div className={cx('load-input', 'row', {'has-error': this.state.loadError})}>
            <div className="col-md-8 col-sm-8 col-xs-7">
              <input className="form-control" type="text" valueLink={this.linkState('link')} onKeyPress={this.onKeyPress} placeholder="e.g. http://server.com/grammar.pegjs" />
            </div>
            <button className="btn btn-primary col-md-3 col-sm-3 col-xs-4" onClick={this.onLoadGrammar} disabled={this.state.loading}>
              {this.state.loading ? 'Loading...' : 'Load Grammar'}
            </button>
          </div>
          <p className="load-examples">
            Try some examples:
            {this.state.examples.map(example =>
              <a href={'#'+example.link} onClick={this.onSwitchGrammar.bind(this, example.link)}>{example.name}</a>
            )}
          </p>
          {this.state.loadError && <div className="alert alert-danger">
            {this.state.loadError}
          </div>}
          
          <div className={cx({'has-error': this.state.syntaxError})}>
            <textarea className="form-control grammar-edit" value={this.state.grammar} onChange={this.onChangeGrammar} />
            {this.state.syntaxError && <pre className="alert alert-danger">
              {e.name} on line {e.line}, column {e.column}:{'\n'}
              {new Array(e.column).join(' ')}|{'\n'}
              {e.lineCode}{'\n\n'}
              {e.message}
            </pre>}
          </div>
        </div>
        
        <div className="col-md-6">
          {this.state.rules.map(rule =>
            <div>
              <h3 id={rule.name}>{rule.name}</h3>
              <div dangerouslySetInnerHTML={{__html: rule.diagram}}/>
            </div>
          )}
        </div>
      </div>
    );
  },
  
  onChangeGrammar(ev) {
    this.setState({grammar: ev.target.value});
    this.updateGrammarDebounced(ev.target.value);
  },
  
  onSwitchGrammar(link, ev) {
    this.loadGrammar(link);
  },
  
  onLoadGrammar() {
    this.loadGrammar(this.state.link);
  },
  
  onKeyPress(ev) {
    if (ev.which === 13) {
      // load grammar on enter
      this.loadGrammar(this.state.link);
    }
  },
  
  updateGrammar(grammar) {
    var state = {grammar: grammar};
    var ast;
    
    try {
      ast = parse(grammar);
    } catch (e) {
      e.lineCode = grammar.split('\n')[e.line-1];
      state.syntaxError = e;
      this.setState(state);
      return;
    }

    state.syntaxError = null;
    state.rules = ast.rules.map(function(rule) {
      return {
        name: rule.name,
        diagram: diagram(rule)
      };
    });
    this.setState(state);
  },
  
  loadGrammar(link) {
    link = link.trim().replace(/^https?:\/\/github.com\/|https?:\/\/raw.githubusercontent.com\//, 'https://cdn.rawgit.com/');
    location.hash = link;
    this.setState({
      link: link,
      grammar: '',
      rules: [],
      loading: true,
      loadError: null,
    });
    request(link, function(er, response, body) {
      this.setState({loading: false})
      if (er || response.status !== 200) {
        this.setState({loadError: '' + (er || body)});
      } else {
        this.updateGrammar(body);
      }
    }.bind(this))
  }
});

module.exports = App;